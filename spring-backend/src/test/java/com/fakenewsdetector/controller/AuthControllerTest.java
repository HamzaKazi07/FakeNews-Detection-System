package com.fakenewsdetector.controller;

import com.fakenewsdetector.dto.AuthDtos.AuthView;
import com.fakenewsdetector.dto.AuthDtos.Login;
import com.fakenewsdetector.dto.AuthDtos.Register;
import com.fakenewsdetector.dto.AuthDtos.UserView;
import com.fakenewsdetector.entity.Role;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.ApiExceptionHandler;
import com.fakenewsdetector.exception.DuplicateRegistrationException;
import com.fakenewsdetector.repository.UserRepository;
import com.fakenewsdetector.security.JwtAuthenticationFilter;
import com.fakenewsdetector.security.JwtService;
import com.fakenewsdetector.security.SecurityConfig;
import com.fakenewsdetector.service.AuthService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({ApiExceptionHandler.class, SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = "app.frontend-url=http://localhost:5173")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService service;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @Test
    void validRegistrationReturnsCreatedEnvelope() throws Exception {
        when(service.register(any(Register.class)))
                .thenReturn(new com.fakenewsdetector.dto.AuthDtos.UserView(1L, "Test User", "test@example.com", "USER"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"));
    }

    @Test
    void validLoginReturnsTokenAndUser() throws Exception {
        when(service.login(any(Login.class))).thenReturn(new AuthView(
                "valid-token",
                new UserView(1L, "Test User", "test@example.com", "USER")
        ));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"test@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("valid-token"))
                .andExpect(jsonPath("$.data.user.email").value("test@example.com"));
    }

    @Test
    void unauthenticatedCurrentUserRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void openApiIsNotPublicByDefault() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validJwtReturnsCurrentUserWithoutPasswordFields() throws Exception {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn("1");
        when(jwtService.parse("valid-token")).thenReturn(claims);
        User user = mock(User.class);
        when(user.getId()).thenReturn(1L);
        when(user.getRole()).thenReturn(Role.USER);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(service.current(user)).thenReturn(
                new UserView(1L, "Test User", "test@example.com", "USER")
        );

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist());
    }

    @Test
    void duplicateRegistrationReturnsConflictEnvelope() throws Exception {
        when(service.register(any(Register.class)))
                .thenThrow(new DuplicateRegistrationException("Email is already registered."));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_REGISTRATION"))
                .andExpect(jsonPath("$.error.message").value("Email is already registered."));
    }
}
