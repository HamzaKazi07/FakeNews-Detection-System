package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.DashboardService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = DashboardController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5173")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DashboardService service;

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
    void unauthenticatedDashboardRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedDashboardRequestReturnsSuccessEnvelope() throws Exception {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(service.stats(eq(user))).thenReturn(Map.of(
                "total_predictions", 2L,
                "real_count", 1L,
                "fake_count", 1L,
                "feedback_correct", 1L,
                "feedback_incorrect", 0L,
                "average_confidence", 0.75,
                "highest_confidence", 0.95,
                "lowest_confidence", 0.55,
                "daily_stats", List.of()
        ));

        mockMvc.perform(get("/api/dashboard/stats")
                        .with(authentication(new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_USER"))
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.total_predictions").value(2))
                .andExpect(jsonPath("$.data.real_count").value(1))
                .andExpect(jsonPath("$.data.fake_count").value(1))
                .andExpect(jsonPath("$.data.average_confidence").value(0.75))
                .andExpect(jsonPath("$.data.highest_confidence").value(0.95))
                .andExpect(jsonPath("$.data.lowest_confidence").value(0.55))
                .andExpect(jsonPath("$.data.feedback_correct").value(1))
                .andExpect(jsonPath("$.data.feedback_incorrect").value(0))
                .andExpect(jsonPath("$.data.daily_stats").isArray());

        verify(service).stats(user);
    }
}
