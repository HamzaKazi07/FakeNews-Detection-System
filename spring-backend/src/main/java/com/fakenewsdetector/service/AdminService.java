package com.fakenewsdetector.service;

import com.fakenewsdetector.dto.AdminDtos.AdminLog;
import com.fakenewsdetector.dto.AdminDtos.AdminStats;
import com.fakenewsdetector.dto.AdminDtos.AdminUser;
import com.fakenewsdetector.entity.Role;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.AdminOperationException;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import com.fakenewsdetector.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final UserRepository users;
    private final PredictionHistoryRepository predictions;
    private final FeedbackRepository feedback;

    public AdminService(
            UserRepository users,
            PredictionHistoryRepository predictions,
            FeedbackRepository feedback
    ) {
        this.users = users;
        this.predictions = predictions;
        this.feedback = feedback;
    }

    public List<AdminUser> users() {
        return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(user -> new AdminUser(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRole().name()
                ))
                .toList();
    }

    @Transactional
    public void deleteUser(Long userId, User currentUser) {
        if (userId.equals(currentUser.getId())) {
            throw new AdminOperationException(
                    HttpStatus.CONFLICT,
                    "ADMIN_DELETE_CONFLICT",
                    "An administrator cannot delete their own account."
            );
        }

        User target = users.findById(userId)
                .orElseThrow(() -> notFound("User"));
        if (target.getRole() == Role.ADMIN) {
            throw new AdminOperationException(
                    HttpStatus.CONFLICT,
                    "ADMIN_DELETE_CONFLICT",
                    "Administrator accounts cannot be deleted."
            );
        }

        users.delete(target);
    }

    public List<AdminLog> logs() {
        Map<Long, String> feedbackByHistoryId = feedback.findAllHistoryFeedback().stream()
                .collect(Collectors.toMap(
                        FeedbackRepository.HistoryFeedbackProjection::getHistoryId,
                        FeedbackRepository.HistoryFeedbackProjection::getValue
                ));

        return predictions.findAllByOrderByCreatedAtDesc().stream()
                .map(item -> new AdminLog(
                        item.getId(),
                        item.getUser().getId(),
                        item.getUser().getName(),
                        item.getUser().getEmail(),
                        item.getNews(),
                        item.getPrediction(),
                        item.getConfidence(),
                        feedbackByHistoryId.get(item.getId()),
                        item.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void deleteLog(Long logId) {
        var prediction = predictions.findById(logId)
                .orElseThrow(() -> notFound("Prediction history entry"));
        predictions.delete(prediction);
    }

    public AdminStats stats() {
        return new AdminStats(
                users.countByRole(Role.USER),
                predictions.count(),
                predictions.countByPrediction("REAL"),
                predictions.countByPrediction("FAKE"),
                feedback.countByValue("yes"),
                feedback.countByValue("no")
        );
    }

    private AdminOperationException notFound(String resource) {
        return new AdminOperationException(
                HttpStatus.NOT_FOUND,
                "ADMIN_RESOURCE_NOT_FOUND",
                resource + " not found."
        );
    }
}
