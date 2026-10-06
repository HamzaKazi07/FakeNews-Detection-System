package com.fakenewsdetector.service;

import com.fakenewsdetector.dto.AuthDtos.AuthView;
import com.fakenewsdetector.dto.AuthDtos.Login;
import com.fakenewsdetector.dto.AuthDtos.Register;
import com.fakenewsdetector.dto.AuthDtos.UserView;
import com.fakenewsdetector.entity.Role;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.DuplicateRegistrationException;
import com.fakenewsdetector.repository.UserRepository;
import com.fakenewsdetector.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository users;

    @Mock
    private PasswordEncoder encoder;

    @Mock
    private JwtService jwt;

    @InjectMocks
    private AuthService service;

    @Test
    void registerCreatesNormalUserWithNormalizedEmail() {
        Register request = new Register("Test User", " Test@Example.com ", "password123");
        when(users.existsByEmailIgnoreCase("test@example.com")).thenReturn(false);
        when(encoder.encode("password123")).thenReturn("encoded");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserView result = service.register(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Test User");
        assertThat(captor.getValue().getEmail()).isEqualTo("test@example.com");
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("encoded");
        assertThat(captor.getValue().getRole()).isEqualTo(Role.USER);
        assertThat(result.email()).isEqualTo("test@example.com");
    }

    @Test
    void registerRejectsDuplicateEmailWithDedicatedException() {
        Register request = new Register("Test User", "Test@Example.com", "password123");
        when(users.existsByEmailIgnoreCase("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.register(request))
                .isInstanceOf(DuplicateRegistrationException.class)
                .hasMessage("Email is already registered.");

        verifyNoMoreInteractions(encoder);
    }

    @Test
    void loginReturnsTokenAndUser() {
        User user = new User("Test User", "test@example.com", "encoded", Role.USER);
        when(users.findByEmailIgnoreCase("Test@Example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("password123", "encoded")).thenReturn(true);
        when(jwt.issue(user)).thenReturn("token");

        AuthView result = service.login(new Login(" Test@Example.com ", "password123"));

        assertThat(result.token()).isEqualTo("token");
        assertThat(result.user().email()).isEqualTo("test@example.com");
        assertThat(result.user().role()).isEqualTo("USER");
    }

    @Test
    void loginRejectsUnknownEmail() {
        when(users.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new Login("missing@example.com", "password123")))
                .isInstanceOf(SecurityException.class)
                .hasMessage("Invalid email or password.");
    }

    @Test
    void loginRejectsWrongPassword() {
        User user = new User("Test User", "test@example.com", "encoded", Role.USER);
        when(users.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new Login("test@example.com", "wrong")))
                .isInstanceOf(SecurityException.class)
                .hasMessage("Invalid email or password.");
    }
}
