package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.Feedback;
import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.FeedbackHistoryNotFoundException;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private PredictionHistoryRepository historyRepository;

    @InjectMocks
    private FeedbackService service;

    @Test
    void submitsYesFeedbackForAuthenticatedUsersHistory() {
        User user = user(7L);
        PredictionHistory history = mock(PredictionHistory.class);
        when(historyRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(history));
        when(feedbackRepository.findByHistoryIdAndUserId(12L, 7L)).thenReturn(Optional.empty());

        service.submit(12L, "yes", user);

        ArgumentCaptor<Feedback> captor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(captor.capture());
        assertThat(captor.getValue()).isNotNull();
        verify(historyRepository).findByIdAndUserId(12L, 7L);
        verify(feedbackRepository).findByHistoryIdAndUserId(12L, 7L);
    }

    @Test
    void submitsNoFeedbackForAuthenticatedUsersHistory() {
        User user = user(7L);
        PredictionHistory history = mock(PredictionHistory.class);
        when(historyRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(history));
        when(feedbackRepository.findByHistoryIdAndUserId(12L, 7L)).thenReturn(Optional.empty());

        service.submit(12L, "no", user);

        verify(feedbackRepository).save(any(Feedback.class));
    }

    @Test
    void rejectsInvalidFeedbackBeforeDatabaseAccess() {
        assertThatThrownBy(() -> service.submit(12L, "maybe", mock(User.class)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Feedback must be yes or no.");

        verifyNoInteractions(historyRepository, feedbackRepository);
    }

    @Test
    void rejectsMissingOrUnauthorizedHistory() {
        when(historyRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(12L, "yes", user(7L)))
                .isInstanceOf(FeedbackHistoryNotFoundException.class)
                .hasMessage("History entry not found or unauthorized.");

        verify(historyRepository).findByIdAndUserId(12L, 7L);
        verifyNoInteractions(feedbackRepository);
    }

    @Test
    void updatesExistingFeedbackInsteadOfCreatingAnotherRow() {
        User user = user(7L);
        PredictionHistory history = mock(PredictionHistory.class);
        Feedback existing = mock(Feedback.class);
        when(historyRepository.findByIdAndUserId(12L, 7L)).thenReturn(Optional.of(history));
        when(feedbackRepository.findByHistoryIdAndUserId(12L, 7L)).thenReturn(Optional.of(existing));

        service.submit(12L, "no", user);

        verify(existing).setValue("no");
        verify(feedbackRepository).save(existing);
    }

    private User user(Long id) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        return user;
    }
}
