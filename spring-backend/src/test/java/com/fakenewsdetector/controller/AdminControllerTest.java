package com.fakenewsdetector.controller;

import com.fakenewsdetector.dto.AdminDtos.AdminLog;
import com.fakenewsdetector.dto.AdminDtos.AdminStats;
import com.fakenewsdetector.dto.AdminDtos.AdminUser;
import com.fakenewsdetector.entity.Role;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.AdminService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5174")
class AdminControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminService service;

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
    void unauthenticatedAdminRequestsReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/admin/users/9")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/logs")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/admin/logs/12")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/stats")).andExpect(status().isUnauthorized());

        verifyNoInteractions(service);
    }

    @Test
    void regularUsersCannotAccessAdminEndpoints() throws Exception {
        var user = authentication(token(user(Role.USER)));

        mockMvc.perform(get("/api/admin/users").with(user)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/admin/users/9").with(user)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/logs").with(user)).andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/admin/logs/12").with(user)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/stats").with(user)).andExpect(status().isForbidden());

        verifyNoInteractions(service);
    }

    @Test
    void adminCanListUsersWithoutExposingCredentials() throws Exception {
        when(service.users()).thenReturn(List.of(
                new AdminUser(9L, "Regular User", "user@example.com", "USER")
        ));

        mockMvc.perform(get("/api/admin/users").with(authentication(token(user(Role.ADMIN)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.users[0].id").value(9))
                .andExpect(jsonPath("$.data.users[0].name").value("Regular User"))
                .andExpect(jsonPath("$.data.users[0].email").value("user@example.com"))
                .andExpect(jsonPath("$.data.users[0].role").value("USER"))
                .andExpect(jsonPath("$..password").doesNotExist())
                .andExpect(jsonPath("$..passwordHash").doesNotExist())
                .andExpect(content().string(not(containsString("sensitive-hash"))));
    }

    @Test
    void adminCanListPredictionLogsWithOwnerAndFeedback() throws Exception {
        when(service.logs()).thenReturn(List.of(new AdminLog(
                12L,
                9L,
                "Regular User",
                "user@example.com",
                "Article text",
                "REAL",
                BigDecimal.valueOf(0.91),
                "yes",
                Instant.parse("2026-09-20T12:00:00Z")
        )));

        mockMvc.perform(get("/api/admin/logs").with(authentication(token(user(Role.ADMIN)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.logs[0].id").value(12))
                .andExpect(jsonPath("$.data.logs[0].userId").value(9))
                .andExpect(jsonPath("$.data.logs[0].userName").value("Regular User"))
                .andExpect(jsonPath("$.data.logs[0].userEmail").value("user@example.com"))
                .andExpect(jsonPath("$.data.logs[0].news").value("Article text"))
                .andExpect(jsonPath("$.data.logs[0].prediction").value("REAL"))
                .andExpect(jsonPath("$.data.logs[0].confidence").value(0.91))
                .andExpect(jsonPath("$.data.logs[0].feedback").value("yes"))
                .andExpect(jsonPath("$.data.logs[0].createdAt").value("2026-09-20T12:00:00Z"));
    }

    @Test
    void adminCanReadGlobalStatistics() throws Exception {
        when(service.stats()).thenReturn(new AdminStats(4, 12, 7, 5, 3, 1));

        mockMvc.perform(get("/api/admin/stats").with(authentication(token(user(Role.ADMIN)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total_users").value(4))
                .andExpect(jsonPath("$.data.total_predictions").value(12))
                .andExpect(jsonPath("$.data.real_count").value(7))
                .andExpect(jsonPath("$.data.fake_count").value(5))
                .andExpect(jsonPath("$.data.feedback_correct").value(3))
                .andExpect(jsonPath("$.data.feedback_incorrect").value(1));
    }

    @Test
    void adminCanDeleteUserAndPredictionHistoryEntry() throws Exception {
        User admin = user(Role.ADMIN);

        mockMvc.perform(delete("/api/admin/users/9").with(authentication(token(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("User deleted successfully."));
        mockMvc.perform(delete("/api/admin/logs/12").with(authentication(token(admin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message").value("Prediction history entry deleted."));

        verify(service).deleteUser(9L, admin);
        verify(service).deleteLog(12L);
    }

    private User user(Role role) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(role == Role.ADMIN ? 1L : 7L);
        when(user.getRole()).thenReturn(role);
        return user;
    }

    private UsernamePasswordAuthenticationToken token(User user) {
        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
