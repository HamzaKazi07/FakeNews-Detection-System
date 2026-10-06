package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.service.PredictionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Base64;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class PredictionController {

    record Request(
            @NotBlank(message = "News text is required.")
            @Size(min = 20, max = 50000)
            String text
    ) {}

    record UrlRequest(
            @NotBlank(message = "Article URL is required.")
            @Size(max = 2048, message = "Article URL is too long.")
            String url
    ) {}

    private final PredictionService service;

    public PredictionController(PredictionService s) {
        service = s;
    }

    @PostMapping("/api/predict")
    public Map<String, Object> predict(
            @AuthenticationPrincipal User u,
            @Valid @RequestBody Request r
    ) {
        return Map.of(
                "success", true,
                "data", service.predict(u, r.text())
        );
    }

    @PostMapping("/api/predict-url")
    public Map<String, Object> predictUrl(
            @AuthenticationPrincipal User u,
            @Valid @RequestBody UrlRequest r
    ) {
        return Map.of(
                "success", true,
                "data", service.predictUrl(u, r.url())
        );
    }

    @PostMapping("/api/predict-image")
    public PredictionService.ImageResponse predictImage(
            @AuthenticationPrincipal User u,
            @RequestParam("image") org.springframework.web.multipart.MultipartFile image
    ) throws java.io.IOException {

        if (image.isEmpty()) {
            throw new IllegalArgumentException("Image is missing.");
        }

        String base64 = Base64.getEncoder()
                .encodeToString(image.getBytes());

        return service.predictImage(u, base64);
    }
}