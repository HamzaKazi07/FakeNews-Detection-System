package com.fakenewsdetector.controller;

import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.exception.LiveNewsUnavailableException;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.LiveNewsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LiveNewsController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5174")
class LiveNewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LiveNewsService service;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void allowMockFilterToContinueChain() throws Exception {
        doAnswer(invocation -> {
            FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(jwtAuthenticationFilter).doFilter(
                any(ServletRequest.class),
                any(ServletResponse.class),
                any(FilterChain.class)
        );
    }

    @Test
    void unauthenticatedGetReturnsNormalizedNews() throws Exception {
        when(service.getLiveNews()).thenReturn(new LiveNewsService.LiveNewsResponse(
                List.of(new LiveNewsService.NewsArticle(
                        "Headline", "Description", "https://news.example.test/article", null, null
                )),
                "BBC News RSS Feed"
        ));

        mockMvc.perform(get("/api/live-news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("BBC News RSS Feed"))
                .andExpect(jsonPath("$.news[0].title").value("Headline"))
                .andExpect(jsonPath("$.news[0].description").value("Description"))
                .andExpect(jsonPath("$.news[0].link").value("https://news.example.test/article"))
                .andExpect(jsonPath("$.news[0].prediction").value(nullValue()))
                .andExpect(jsonPath("$.news[0].confidence").value(nullValue()));
    }

    @Test
    void configuredDevelopmentOriginsAreAllowed() throws Exception {
        for (String origin : List.of("http://localhost:5174", "http://127.0.0.1:5174")) {
            mockMvc.perform(get("/api/live-news").header("Origin", origin))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Access-Control-Allow-Origin", origin));
        }
    }

    @Test
    void unavailableFeedReturnsCleanError() throws Exception {
        when(service.getLiveNews()).thenThrow(new LiveNewsUnavailableException());

        mockMvc.perform(get("/api/live-news"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("LIVE_NEWS_UNAVAILABLE"))
                .andExpect(jsonPath("$.error.message").value(
                        "The configured live news feed is temporarily unavailable."
                ));
    }

    @Test
    void otherApplicationEndpointsRemainProtected() throws Exception {
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/predict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
