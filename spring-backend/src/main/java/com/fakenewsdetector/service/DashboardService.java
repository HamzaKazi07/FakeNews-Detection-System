package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    public record DailyStat(LocalDate day, long count) {
    }

    private final PredictionHistoryRepository predictions;
    private final FeedbackRepository feedback;

    public DashboardService(
            PredictionHistoryRepository predictions,
            FeedbackRepository feedback
    ) {
        this.predictions = predictions;
        this.feedback = feedback;
    }

    public Map<String, Object> stats(User user) {
        Long userId = user.getId();
        long totalPredictions = predictions.countByUserId(userId);
        List<DailyStat> dailyStats = predictions.findDailyStatsByUserId(userId).stream()
                .map(item -> new DailyStat(item.getDay(), item.getCount()))
                .toList();
        PredictionHistoryRepository.ConfidenceStatsProjection confidenceStats = totalPredictions == 0
                ? null
                : predictions.findConfidenceStatsByUserId(userId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total_predictions", totalPredictions);
        result.put("real_count", predictions.countByUserIdAndPrediction(userId, "REAL"));
        result.put("fake_count", predictions.countByUserIdAndPrediction(userId, "FAKE"));
        result.put("feedback_correct", feedback.countByUserIdAndValue(userId, "yes"));
        result.put("feedback_incorrect", feedback.countByUserIdAndValue(userId, "no"));
        result.put("daily_stats", dailyStats);
        result.put("average_confidence", confidenceStats == null ? null : confidenceStats.getAverageConfidence());
        result.put("highest_confidence", confidenceStats == null ? null : confidenceStats.getHighestConfidence());
        result.put("lowest_confidence", confidenceStats == null ? null : confidenceStats.getLowestConfidence());
        return result;
    }
}