package com.fakenewsdetector.service;

import com.fakenewsdetector.client.MlServiceClient;
import com.fakenewsdetector.entity.PredictionHistory;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.repository.PredictionHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class PredictionService {

    public record Response(
            Long id,
            String prediction,
            BigDecimal confidence,
            List<String> importantWords,
            String modelVersion
    ) {
    }

    private final MlServiceClient ml;
    private final PredictionHistoryRepository history;

    public PredictionService(
            MlServiceClient m,
            PredictionHistoryRepository h
    ) {
        ml = m;
        history = h;
    }

    @Transactional
    public Response predict(User u, String text) {
        var r = ml.predict(text);

        var saved = history.save(
                new PredictionHistory(
                        u,
                        text,
                        r.prediction(),
                        BigDecimal.valueOf(r.confidence()),
                        r.modelVersion()
                )
        );

        return new Response(
                saved.getId(),
                saved.getPrediction(),
                saved.getConfidence(),
                r.importantWords(),
                saved.getModelVersion()
        );
    }
}