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
    private final UrlArticleService urlArticleService;

    public PredictionService(
            MlServiceClient m,
            PredictionHistoryRepository h,
            UrlArticleService u
    ) {
        ml = m;
        history = h;
        urlArticleService = u;
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

    public record ImageResponse(
            Long id,
            String prediction,
            BigDecimal confidence,
            List<String> importantWords,
            String modelVersion,
            String extracted_text
    ) {
    }

    @Transactional
    public ImageResponse predictImage(
            User u,
            String base64Image
    ) {
        var r = ml.predictImage(base64Image);

        var saved = history.save(
                new PredictionHistory(
                        u,
                        r.extractedText(),
                        r.prediction(),
                        BigDecimal.valueOf(r.confidence()),
                        r.modelVersion()
                )
        );

        return new ImageResponse(
                saved.getId(),
                saved.getPrediction(),
                saved.getConfidence(),
                r.importantWords(),
                saved.getModelVersion(),
                r.extractedText()
        );
    }

    public record UrlResponse(
            Long id,
            String prediction,
            BigDecimal confidence,
            List<String> importantWords,
            String modelVersion,
            String scraped_text,
            String source_url
    ) {
    }

    @Transactional
    public UrlResponse predictUrl(
            User u,
            String url
    ) {
        UrlArticleService.Article article =
                urlArticleService.fetchArticle(url);

        var r = ml.predict(article.text());

        var saved = history.save(
                new PredictionHistory(
                        u,
                        article.text(),
                        r.prediction(),
                        BigDecimal.valueOf(r.confidence()),
                        r.modelVersion()
                )
        );

        return new UrlResponse(
                saved.getId(),
                saved.getPrediction(),
                saved.getConfidence(),
                r.importantWords(),
                saved.getModelVersion(),
                article.text(),
                article.url()
        );
    }
}