package com.fakenewsdetector.repository;

import com.fakenewsdetector.entity.Feedback;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    interface HistoryFeedbackProjection {
        Long getHistoryId();

        String getValue();
    }

    Optional<Feedback> findByHistoryIdAndUserId(Long historyId, Long userId);

    long countByUserIdAndValue(Long userId, String value);

    long countByValue(String value);

    @Query("select f.history.id as historyId, f.value as value from Feedback f")
    List<HistoryFeedbackProjection> findAllHistoryFeedback();

    @Query("select f.history.id as historyId, f.value as value from Feedback f where f.history.id in :historyIds")
    List<HistoryFeedbackProjection> findHistoryFeedbackByHistoryIds(
            @Param("historyIds") Collection<Long> historyIds
    );
}
