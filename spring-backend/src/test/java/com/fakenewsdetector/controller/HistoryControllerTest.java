package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.HistoryService;
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

@WebMvcTest(controllers = HistoryController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5173")
class HistoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private HistoryService service;

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
    void unauthenticatedHistoryRequestIsRejected() throws Exception {
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedHistoryRequestReturnsEnvelopeAndPassesPagination() throws Exception {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(service.findForUser(eq(user), eq(2), eq(10)))
                .thenReturn(new HistoryService.HistoryPage(List.of(), 2, 10, 0, 0));

        mockMvc.perform(get("/api/history")
                        .param("page", "2")
                        .param("size", "10")
                        .with(authentication(new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_USER"))
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.history").isArray())
                .andExpect(jsonPath("$.data.page").value(2))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.totalPages").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(0));

        verify(service).findForUser(user, 2, 10);
    }
}
