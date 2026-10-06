package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.Role;
import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.AdminOperationException;
import com.fakenewsdetector.dto.AdminDtos.AdminLog;
import com.fakenewsdetector.dto.AdminDtos.AdminStats;
import com.fakenewsdetector.dto.AdminDtos.AdminUser;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import com.fakenewsdetector.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {
    @Mock
    private UserRepository users;

    @Mock
    private PredictionHistoryRepository predictions;

    @Mock
    private FeedbackRepository feedback;

    @InjectMocks
    private AdminService service;

    @Test
    void listsOnlyPublicUserFields() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        when(user.getName()).thenReturn("Regular User");
        when(user.getEmail()).thenReturn("user@example.com");
        when(user.getRole()).thenReturn(Role.USER);
        when(users.findAll(any(Sort.class))).thenReturn(List.of(user));

        List<AdminUser> result = service.users();

        assertThat(result).containsExactly(
                new AdminUser(7L, "Regular User", "user@example.com", "USER")
        );
    }

    @Test
    void listsPredictionHistoryWithOwnerFeedbackAndDate() {
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(7L);
        when(owner.getName()).thenReturn("Regular User");
        when(owner.getEmail()).thenReturn("user@example.com");
        PredictionHistory history = mock(PredictionHistory.class);
        when(history.getId()).thenReturn(12L);
        when(history.getUser()).thenReturn(owner);
        when(history.getNews()).thenReturn("Article text");
        when(history.getPrediction()).thenReturn("REAL");
        when(history.getConfidence()).thenReturn(BigDecimal.valueOf(0.91));
        when(history.getCreatedAt()).thenReturn(Instant.parse("2026-09-20T12:00:00Z"));
        FeedbackRepository.HistoryFeedbackProjection feedbackItem =
                mock(FeedbackRepository.HistoryFeedbackProjection.class);
        when(feedbackItem.getHistoryId()).thenReturn(12L);
        when(feedbackItem.getValue()).thenReturn("yes");
        when(feedback.findAllHistoryFeedback()).thenReturn(List.of(feedbackItem));
        when(predictions.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(history));

        List<AdminLog> result = service.logs();

        assertThat(result).containsExactly(new AdminLog(
                12L,
                7L,
                "Regular User",
                "user@example.com",
                "Article text",
                "REAL",
                BigDecimal.valueOf(0.91),
                "yes",
                Instant.parse("2026-09-20T12:00:00Z")
        ));
    }

    @Test
    void aggregatesGlobalStatisticsFromExistingRepositories() {
        when(users.countByRole(Role.USER)).thenReturn(4L);
        when(predictions.count()).thenReturn(12L);
        when(predictions.countByPrediction("REAL")).thenReturn(7L);
        when(predictions.countByPrediction("FAKE")).thenReturn(5L);
        when(feedback.countByValue("yes")).thenReturn(3L);
        when(feedback.countByValue("no")).thenReturn(1L);

        assertThat(service.stats()).isEqualTo(new AdminStats(4, 12, 7, 5, 3, 1));
    }

    @Test
    void adminCannotDeleteTheirOwnAccount() {
        User admin = mock(User.class);
        when(admin.getId()).thenReturn(1L);

        assertThatThrownBy(() -> service.deleteUser(1L, admin))
                .isInstanceOf(AdminOperationException.class)
                .hasMessage("An administrator cannot delete their own account.")
                .extracting(exception -> ((AdminOperationException) exception).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(users, never()).findById(1L);
        verify(users, never()).delete(admin);
    }

    @Test
    void adminAccountsCannotBeDeleted() {
        User currentAdmin = mock(User.class);
        when(currentAdmin.getId()).thenReturn(1L);
        User otherAdmin = mock(User.class);
        when(otherAdmin.getRole()).thenReturn(Role.ADMIN);
        when(users.findById(2L)).thenReturn(Optional.of(otherAdmin));

        assertThatThrownBy(() -> service.deleteUser(2L, currentAdmin))
                .isInstanceOf(AdminOperationException.class)
                .hasMessage("Administrator accounts cannot be deleted.")
                .extracting(exception -> ((AdminOperationException) exception).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(users, never()).delete(otherAdmin);
    }

    @Test
    void deletesOnlyTheSelectedPredictionHistoryEntry() {
        PredictionHistory history = mock(PredictionHistory.class);
        when(predictions.findById(12L)).thenReturn(Optional.of(history));

        service.deleteLog(12L);

        verify(predictions).delete(history);
    }
}
