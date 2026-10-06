package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private PredictionHistoryRepository predictions;

    @Mock
    private FeedbackRepository feedback;

    @InjectMocks
    private DashboardService service;

    @Test
    void statsUsesAuthenticatedUserForAllAggregatesAndMapsDailyStats() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(7L);
        PredictionHistoryRepository.DailyStatsProjection daily = mock(PredictionHistoryRepository.DailyStatsProjection.class);
        when(daily.getDay()).thenReturn(LocalDate.of(2026, 9, 20));
        when(daily.getCount()).thenReturn(4L);
        when(predictions.countByUserId(7L)).thenReturn(10L);
        when(predictions.countByUserIdAndPrediction(7L, "REAL")).thenReturn(6L);
        when(predictions.countByUserIdAndPrediction(7L, "FAKE")).thenReturn(4L);
        when(predictions.findDailyStatsByUserId(7L)).thenReturn(List.of(daily));
        PredictionHistoryRepository.ConfidenceStatsProjection confidenceStats =
                mock(PredictionHistoryRepository.ConfidenceStatsProjection.class);
        when(confidenceStats.getAverageConfidence()).thenReturn(0.5);
        when(confidenceStats.getHighestConfidence()).thenReturn(new BigDecimal("0.9000"));
        when(confidenceStats.getLowestConfidence()).thenReturn(new BigDecimal("0.1000"));
        when(predictions.findConfidenceStatsByUserId(7L)).thenReturn(confidenceStats);
        when(feedback.countByUserIdAndValue(7L, "yes")).thenReturn(3L);
        when(feedback.countByUserIdAndValue(7L, "no")).thenReturn(1L);

        Map<String, Object> result = service.stats(user);

        assertThat(result).containsEntry("total_predictions", 10L)
                .containsEntry("real_count", 6L)
                .containsEntry("fake_count", 4L)
                .containsEntry("feedback_correct", 3L)
                .containsEntry("feedback_incorrect", 1L)
                .containsEntry("average_confidence", 0.5)
                .containsEntry("highest_confidence", new BigDecimal("0.9000"))
                .containsEntry("lowest_confidence", new BigDecimal("0.1000"));
        assertThat(result.get("daily_stats"))
            .isEqualTo(List.of(new DashboardService.DailyStat(LocalDate.of(2026, 9, 20), 4L)));
        verify(predictions).countByUserId(7L);
        verify(predictions).countByUserIdAndPrediction(7L, "REAL");
        verify(predictions).countByUserIdAndPrediction(7L, "FAKE");
        verify(predictions).findDailyStatsByUserId(7L);
        verify(predictions).findConfidenceStatsByUserId(7L);
        verify(feedback).countByUserIdAndValue(eq(7L), eq("yes"));
        verify(feedback).countByUserIdAndValue(eq(7L), eq("no"));
    }

    @Test
    void statsReturnsNullConfidenceMetricsWhenUserHasNoPredictions() {
        User user = mock(User.class);
        when(user.getId()).thenReturn(11L);
        when(predictions.countByUserId(11L)).thenReturn(0L);
        when(predictions.countByUserIdAndPrediction(11L, "REAL")).thenReturn(0L);
        when(predictions.countByUserIdAndPrediction(11L, "FAKE")).thenReturn(0L);
        when(predictions.findDailyStatsByUserId(11L)).thenReturn(List.of());
        when(feedback.countByUserIdAndValue(11L, "yes")).thenReturn(0L);
        when(feedback.countByUserIdAndValue(11L, "no")).thenReturn(0L);

        Map<String, Object> result = service.stats(user);

        assertThat(result).containsEntry("total_predictions", 0L)
                .containsEntry("average_confidence", null)
                .containsEntry("highest_confidence", null)
                .containsEntry("lowest_confidence", null);
        org.mockito.Mockito.verify(predictions, org.mockito.Mockito.never())
                .findConfidenceStatsByUserId(11L);
    }
}
