package com.fakenewsdetector.service;

import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.FeedbackRepository;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class HistoryService {

    public record HistoryItem(
            Long id,
            String news,
            String prediction,
            BigDecimal confidence,
            String modelVersion,
            Instant date,
            String feedback
    ) {
    }

    public record HistoryPage(
            List<HistoryItem> history,
            int page,
            int size,
            int totalPages,
            long totalElements
    ) {
    }

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final PredictionHistoryRepository repository;
    private final FeedbackRepository feedbackRepository;

    public HistoryService(
            PredictionHistoryRepository repository,
            FeedbackRepository feedbackRepository
    ) {
        this.repository = repository;
        this.feedbackRepository = feedbackRepository;
    }

    public HistoryPage findForUser(User user, int page, int size) {
        int safePage = Math.max(page, DEFAULT_PAGE);
        int safeSize = size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<PredictionHistory> result = repository.findByUserId(user.getId(), pageable);
        List<Long> historyIds = result.getContent().stream()
                .map(PredictionHistory::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, String> feedbackByHistoryId = historyIds.isEmpty()
                ? Map.of()
                : feedbackRepository.findHistoryFeedbackByHistoryIds(historyIds).stream()
                        .collect(Collectors.toMap(
                                FeedbackRepository.HistoryFeedbackProjection::getHistoryId,
                                FeedbackRepository.HistoryFeedbackProjection::getValue
                        ));
        List<HistoryItem> items = result.getContent().stream()
                .map(item -> toHistoryItem(item, feedbackByHistoryId.get(item.getId())))
                .toList();

        return new HistoryPage(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalPages(),
                result.getTotalElements()
        );
    }

    private HistoryItem toHistoryItem(PredictionHistory item, String feedback) {
        return new HistoryItem(
                item.getId(),
                item.getNews(),
                item.getPrediction(),
                item.getConfidence(),
                item.getModelVersion(),
                item.getCreatedAt(),
                feedback
        );
    }
}