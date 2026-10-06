package com.fakenewsdetector.service;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class UrlArticleService {

    private static final int MAX_HTML_BYTES = 2 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_TEXT_LENGTH = 50_000;
    private static final int MIN_TEXT_LENGTH = 20;

    private final HttpClient client;

    public UrlArticleService() {
        client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                // Redirects are handled manually so every destination
                // receives the same SSRF validation.
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public record Article(
            String url,
            String text
    ) {
    }

    public Article fetchArticle(String rawUrl) {
        URI uri = validateUrl(rawUrl);

        for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
            HttpResponse<InputStream> response = fetch(uri);

            int status = response.statusCode();

            if (status >= 300 && status < 400) {
                String location = response.headers()
                        .firstValue("Location")
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Article URL returned an invalid redirect."
                                ));

                try {
                    URI redirected = uri.resolve(location);
                    uri = validateUrl(redirected.toString());
                } catch (IllegalArgumentException ex) {
                    throw ex;
                } catch (Exception ex) {
                    throw new IllegalArgumentException(
                            "Article URL returned an invalid redirect."
                    );
                }

                closeQuietly(response.body());
                continue;
            }

            if (status < 200 || status >= 300) {
                closeQuietly(response.body());
                throw new IllegalArgumentException(
                        "Unable to fetch article. HTTP status: " + status
                );
            }

            String contentType = response.headers()
                    .firstValue("Content-Type")
                    .orElse("")
                    .toLowerCase();

            if (!contentType.isBlank()
                    && !contentType.contains("text/html")
                    && !contentType.contains("application/xhtml+xml")) {
                closeQuietly(response.body());
                throw new IllegalArgumentException(
                        "The URL does not contain an HTML article."
                );
            }

            byte[] htmlBytes;

            try (InputStream input = response.body()) {
                htmlBytes = readLimited(input, MAX_HTML_BYTES);
            } catch (Exception ex) {
                throw new IllegalArgumentException(
                        "Unable to read the article page."
                );
            }

            String html = new String(
                    htmlBytes,
                    StandardCharsets.UTF_8
            );

            String text = extractArticleText(html);

            if (text.length() < MIN_TEXT_LENGTH) {
                throw new IllegalArgumentException(
                        "The page does not contain enough readable article text."
                );
            }

            if (text.length() > MAX_TEXT_LENGTH) {
                text = text.substring(0, MAX_TEXT_LENGTH);
            }

            return new Article(uri.toString(), text);
        }

        throw new IllegalArgumentException(
                "Too many redirects while fetching the article."
        );
    }

    private HttpResponse<InputStream> fetch(URI uri) {
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(10))
                    .header(
                            "User-Agent",
                            "FakeNewsDetector/1.0"
                    )
                    .header(
                            "Accept",
                            "text/html,application/xhtml+xml"
                    )
                    .GET()
                    .build();

            return client.send(
                    request,
                    HttpResponse.BodyHandlers.ofInputStream()
            );

        } catch (Exception ex) {
            throw new IllegalArgumentException(
                    "Unable to connect to the article URL."
            );
        }
    }

    private URI validateUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException(
                    "Article URL is required."
            );
        }

        if (rawUrl.length() > 2048) {
            throw new IllegalArgumentException(
                    "Article URL is too long."
            );
        }

        final URI uri;

        try {
            uri = URI.create(rawUrl.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid article URL."
            );
        }

        String scheme = uri.getScheme();

        if (!"http".equalsIgnoreCase(scheme)
                && !"https".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException(
                    "Only HTTP and HTTPS URLs are allowed."
            );
        }

        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException(
                    "URLs containing credentials are not allowed."
            );
        }

        String host = uri.getHost();

        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException(
                    "Article URL must contain a valid hostname."
            );
        }

        int port = uri.getPort();

        if (port != -1 && port != 80 && port != 443) {
            throw new IllegalArgumentException(
                    "Only ports 80 and 443 are allowed."
            );
        }

        blockPrivateAddresses(host);

        return uri;
    }

    private void blockPrivateAddresses(String host) {
        try {
            InetAddress[] addresses =
                    InetAddress.getAllByName(host);

            if (addresses.length == 0) {
                throw new IllegalArgumentException(
                        "Unable to resolve article hostname."
                );
            }

            for (InetAddress address : addresses) {
                if (isBlockedAddress(address)) {
                    throw new IllegalArgumentException(
                            "The requested URL points to a private or restricted address."
                    );
                }
            }

        } catch (UnknownHostException ex) {
            throw new IllegalArgumentException(
                    "Unable to resolve article hostname."
            );
        }
    }

    private boolean isBlockedAddress(InetAddress address) {
        if (address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return true;
        }

        byte[] bytes = address.getAddress();

        // IPv4-specific private/reserved ranges.
        if (bytes.length == 4) {
            int a = bytes[0] & 0xff;
            int b = bytes[1] & 0xff;

            // 10.0.0.0/8
            if (a == 10) {
                return true;
            }

            // 172.16.0.0/12
            if (a == 172 && b >= 16 && b <= 31) {
                return true;
            }

            // 192.168.0.0/16
            if (a == 192 && b == 168) {
                return true;
            }

            // 169.254.0.0/16
            if (a == 169 && b == 254) {
                return true;
            }

            // 100.64.0.0/10
            if (a == 100 && b >= 64 && b <= 127) {
                return true;
            }

            // 127.0.0.0/8
            if (a == 127) {
                return true;
            }

            // 0.0.0.0/8
            if (a == 0) {
                return true;
            }
        }

        // IPv6 unique-local addresses: fc00::/7
        if (bytes.length == 16) {
            int first = bytes[0] & 0xff;

            if ((first & 0xfe) == 0xfc) {
                return true;
            }

            // IPv6 link-local: fe80::/10
            if (first == 0xfe
                    && (bytes[1] & 0xc0) == 0x80) {
                return true;
            }
        }

        return false;
    }

    private byte[] readLimited(
            InputStream input,
            int maxBytes
    ) throws Exception {

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        byte[] buffer = new byte[8192];

        int total = 0;
        int read;

        while ((read = input.read(buffer)) != -1) {
            total += read;

            if (total > maxBytes) {
                throw new IllegalArgumentException(
                        "Article page is too large."
                );
            }

            output.write(buffer, 0, read);
        }

        return output.toByteArray();
    }

    private String extractArticleText(String html) {

        String cleaned = html
                .replaceAll(
                        "(?is)<!--.*?-->",
                        " "
                )
                .replaceAll(
                        "(?is)<(script|style|noscript|svg)[^>]*>.*?</\\1>",
                        " "
                );

        // Prefer the <article> element when available.
        Matcher articleMatcher = Pattern.compile(
                "(?is)<article\\b[^>]*>(.*?)</article>"
        ).matcher(cleaned);

        String source = articleMatcher.find()
                ? articleMatcher.group(1)
                : cleaned;

        // Remove remaining HTML tags.
        source = source.replaceAll(
                "(?is)<[^>]+>",
                " "
        );

        // Decode common HTML entities.
        source = decodeEntities(source);

        // Normalize whitespace.
        return source
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String decodeEntities(String text) {
        return text
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&#x27;", "'");
    }

    private void closeQuietly(InputStream input) {
        try {
            if (input != null) {
                input.close();
            }
        } catch (Exception ignored) {
            // Nothing to do.
        }
    }
}