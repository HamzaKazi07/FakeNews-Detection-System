package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.Feedback;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.exception.FeedbackHistoryNotFoundException;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FeedbackService {

    private static final String HISTORY_NOT_FOUND_MESSAGE = "History entry not found or unauthorized.";

    private final FeedbackRepository feedbackRepository;
    private final PredictionHistoryRepository historyRepository;

    public FeedbackService(
            FeedbackRepository feedbackRepository,
            PredictionHistoryRepository historyRepository
    ) {
        this.feedbackRepository = feedbackRepository;
        this.historyRepository = historyRepository;
    }

    @Transactional
    public void submit(Long entryId, String value, User user) {
        if (!"yes".equals(value) && !"no".equals(value)) {
            throw new IllegalArgumentException("Feedback must be yes or no.");
        }

        var history = historyRepository.findByIdAndUserId(entryId, user.getId())
                .orElseThrow(() -> new FeedbackHistoryNotFoundException(HISTORY_NOT_FOUND_MESSAGE));

        var existing = feedbackRepository.findByHistoryIdAndUserId(entryId, user.getId());
        if (existing.isPresent()) {
            existing.get().setValue(value);
            feedbackRepository.save(existing.get());
            return;
        }

        feedbackRepository.save(new Feedback(history, user, value));
    }
}