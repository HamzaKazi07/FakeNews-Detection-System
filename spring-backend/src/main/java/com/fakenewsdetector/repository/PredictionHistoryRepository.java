package com.fakenewsdetector.repository;

import com.fakenewsdetector.entity.PredictionHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PredictionHistoryRepository extends JpaRepository<PredictionHistory, Long> {

	interface DailyStatsProjection {
		LocalDate getDay();

		Long getCount();
	}

	interface ConfidenceStatsProjection {
		Double getAverageConfidence();

		BigDecimal getHighestConfidence();

		BigDecimal getLowestConfidence();
	}

	Page<PredictionHistory> findByUserId(Long userId, Pageable page);

	@EntityGraph(attributePaths = "user")
	List<PredictionHistory> findAllByOrderByCreatedAtDesc();

	Optional<PredictionHistory> findByIdAndUserId(Long id, Long userId);

	long countByUserId(Long userId);

	long countByUserIdAndPrediction(Long userId, String prediction);

	long countByPrediction(String prediction);

	@Query("""
			SELECT AVG(p.confidence) AS averageConfidence,
				   MAX(p.confidence) AS highestConfidence,
				   MIN(p.confidence) AS lowestConfidence
			FROM PredictionHistory p
			WHERE p.user.id = :userId
			""")
	ConfidenceStatsProjection findConfidenceStatsByUserId(@Param("userId") Long userId);

	@Query(value = """
			SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
				   COUNT(*) AS count
			FROM prediction_history
			WHERE user_id = :userId
			GROUP BY (created_at AT TIME ZONE 'UTC')::date
			ORDER BY day ASC
			""", nativeQuery = true)
	List<DailyStatsProjection> findDailyStatsByUserId(@Param("userId") Long userId);
}
