package com.fakenewsdetector.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class AdminDtos {
    private AdminDtos() {
    }

    public record ApiResponse<T>(boolean success, T data) {
    }

    public record UsersData(List<AdminUser> users) {
    }

    public record AdminUser(Long id, String name, String email, String role) {
    }

    public record LogsData(List<AdminLog> logs) {
    }

    public record AdminLog(
            Long id,
            Long userId,
            String userName,
            String userEmail,
            String news,
            String prediction,
            BigDecimal confidence,
            String feedback,
            Instant createdAt
    ) {
    }

    public record AdminStats(
            @JsonProperty("total_users") long totalUsers,
            @JsonProperty("total_predictions") long totalPredictions,
            @JsonProperty("real_count") long realCount,
            @JsonProperty("fake_count") long fakeCount,
            @JsonProperty("feedback_correct") long feedbackCorrect,
            @JsonProperty("feedback_incorrect") long feedbackIncorrect
    ) {
    }

    public record MessageData(String message) {
    }
}
