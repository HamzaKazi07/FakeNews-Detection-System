package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.exception.FeedbackHistoryNotFoundException;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.FeedbackService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FeedbackController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5173")
class FeedbackControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeedbackService service;

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

    private UsernamePasswordAuthenticationToken userAuthentication() {
        User user = org.mockito.Mockito.mock(User.class);
        org.mockito.Mockito.when(user.getId()).thenReturn(7L);
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    @Test
    void authenticatedFeedbackRequestReturnsSuccessEnvelope() throws Exception {
        mockMvc.perform(post("/api/feedback")
                        .with(authentication(userAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entry_id\":12,\"feedback\":\"yes\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.message").value("Feedback submitted successfully"));
    }

    @Test
    void unauthenticatedFeedbackRequestIsRejected() throws Exception {
        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entry_id\":12,\"feedback\":\"yes\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidFeedbackReturnsValidationError() throws Exception {
        doThrow(new IllegalArgumentException("Feedback must be yes or no."))
                .when(service).submit(eq(12L), eq("maybe"), any(User.class));

        mockMvc.perform(post("/api/feedback")
                        .with(authentication(userAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entry_id\":12,\"feedback\":\"maybe\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Feedback must be yes or no."));
    }

    @Test
    void missingHistoryReturnsNotFoundEnvelope() throws Exception {
        doThrow(new FeedbackHistoryNotFoundException("History entry not found or unauthorized."))
                .when(service).submit(eq(12L), eq("yes"), any(User.class));

        mockMvc.perform(post("/api/feedback")
                        .with(authentication(userAuthentication()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"entry_id\":12,\"feedback\":\"yes\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("HISTORY_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("History entry not found or unauthorized."));
    }
}
