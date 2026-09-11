package com.fakenewsdetector.repository;
import com.fakenewsdetector.entity.*; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface FeedbackRepository extends JpaRepository<Feedback,Long>{ Optional<Feedback> findByHistoryIdAndUserId(Long historyId,Long userId); long countByUserIdAndValue(Long userId,String value); }
