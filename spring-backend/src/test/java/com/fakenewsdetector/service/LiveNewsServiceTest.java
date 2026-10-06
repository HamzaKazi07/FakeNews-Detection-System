package com.fakenewsdetector.service;

import com.fakenewsdetector.exception.LiveNewsUnavailableException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LiveNewsServiceTest {

    private static final String RSS_URL = "https://news.example.test/feed.xml";

    @Test
    void parsesRssAndNormalizesValidItems() {
        RestTemplate restTemplate = new RestTemplate(new SimpleClientHttpRequestFactory());
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(requestTo(RSS_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        <?xml version="1.0"?>
                        <rss><channel><item>
                          <title>Headline</title>
                          <description>Article summary</description>
                          <link>https://news.example.test/article</link>
                        </item></channel></rss>
                        """, MediaType.APPLICATION_XML));

        LiveNewsService.LiveNewsResponse response =
                new LiveNewsService(restTemplate, RSS_URL).getLiveNews();

        assertEquals("BBC News RSS Feed", response.source());
        assertEquals(1, response.news().size());
        assertEquals("Headline", response.news().get(0).title());
        assertEquals("Article summary", response.news().get(0).description());
        assertEquals("https://news.example.test/article", response.news().get(0).link());
        assertNull(response.news().get(0).prediction());
        assertNull(response.news().get(0).confidence());
        server.verify();
    }

    @Test
    void skipsMalformedItemsAndReturnsEmptyListForEmptyFeed() {
        RestTemplate restTemplate = new RestTemplate(new SimpleClientHttpRequestFactory());
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(requestTo(RSS_URL))
                .andRespond(withSuccess("""
                        <rss><channel>
                          <item><title>Missing a link</title></item>
                          <item><link>https://news.example.test/no-title</link></item>
                        </channel></rss>
                        """, MediaType.APPLICATION_XML));

        LiveNewsService.LiveNewsResponse response =
                new LiveNewsService(restTemplate, RSS_URL).getLiveNews();

        assertEquals(List.of(), response.news());
        server.verify();
    }

    @Test
    void invalidRssReturnsSafeUnavailableException() {
        RestTemplate restTemplate = new RestTemplate(new SimpleClientHttpRequestFactory());
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(requestTo(RSS_URL))
                .andRespond(withSuccess("<rss><channel>", MediaType.APPLICATION_XML));

        assertThrows(
                LiveNewsUnavailableException.class,
                () -> new LiveNewsService(restTemplate, RSS_URL).getLiveNews()
        );
        server.verify();
    }

    @Test
    void unavailableFeedReturnsSafeUnavailableException() {
        RestTemplate restTemplate = new RestTemplate(new SimpleClientHttpRequestFactory());
        MockRestServiceServer server = MockRestServiceServer.createServer(restTemplate);
        server.expect(requestTo(RSS_URL)).andRespond(withServerError());

        assertThrows(
                LiveNewsUnavailableException.class,
                () -> new LiveNewsService(restTemplate, RSS_URL).getLiveNews()
        );
        server.verify();
    }
}
