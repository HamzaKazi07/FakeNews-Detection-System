package com.fakenewsdetector.repository;
import com.fakenewsdetector.entity.*; import org.springframework.data.domain.*; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface PredictionHistoryRepository extends JpaRepository<PredictionHistory,Long>{ Page<PredictionHistory> findByUserId(Long userId, Pageable page); Optional<PredictionHistory> findByIdAndUserId(Long id,Long userId); long countByUserId(Long userId); long countByUserIdAndPrediction(Long userId,String prediction); }
