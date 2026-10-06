package com.fakenewsdetector.service;

import com.fakenewsdetector.exception.LiveNewsUnavailableException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

@Service
public class LiveNewsService {

    public record NewsArticle(
            String title,
            String description,
            String link,
            String prediction,
            Double confidence
    ) {
    }

    public record LiveNewsResponse(List<NewsArticle> news, String source) {
    }

    private static final Logger log = LoggerFactory.getLogger(LiveNewsService.class);
    private static final String SOURCE = "BBC News RSS Feed";
    private static final int MAX_ARTICLES = 8;

    private final RestTemplate restTemplate;
    private final String rssUrl;

    public LiveNewsService(
            RestTemplate liveNewsRestTemplate,
            @Value("${app.live-news-rss-url}") String rssUrl
    ) {
        this.restTemplate = liveNewsRestTemplate;
        this.rssUrl = rssUrl;
    }

    public LiveNewsResponse getLiveNews() {
        String xml;
        try {
            xml = restTemplate.getForObject(rssUrl, String.class);
        } catch (RestClientException exception) {
            log.warn("Configured live news feed request failed.");
            throw new LiveNewsUnavailableException();
        }

        if (xml == null || xml.isBlank()) {
            throw new LiveNewsUnavailableException();
        }

        try {
            return new LiveNewsResponse(parseArticles(xml), SOURCE);
        } catch (Exception exception) {
            log.warn("Configured live news feed returned invalid RSS.");
            throw new LiveNewsUnavailableException();
        }
    }

    private List<NewsArticle> parseArticles(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        var builder = factory.newDocumentBuilder();
        var document = builder.parse(new InputSource(new StringReader(xml)));
        NodeList items = document.getElementsByTagName("item");
        List<NewsArticle> articles = new ArrayList<>();

        for (int index = 0; index < items.getLength() && articles.size() < MAX_ARTICLES; index++) {
            Node node = items.item(index);
            if (!(node instanceof Element item)) {
                continue;
            }

            String title = childText(item, "title");
            String description = childText(item, "description");
            String link = childText(item, "link");
            if (title.isBlank() || link.isBlank()) {
                continue;
            }

            articles.add(new NewsArticle(title, description, link, null, null));
        }

        return List.copyOf(articles);
    }

    private String childText(Element item, String tagName) {
        NodeList values = item.getElementsByTagName(tagName);
        if (values.getLength() == 0 || values.item(0) == null) {
            return "";
        }

        String value = values.item(0).getTextContent();
        return value == null ? "" : value.trim();
    }
}
