package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.service.FeedbackService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    public record Request(
            @NotNull(message = "Entry ID is required.")
            @Positive(message = "Entry ID must be positive.")
            Long entry_id,
            @NotBlank(message = "Feedback is required.")
            String feedback
    ) {
    }

    private final FeedbackService service;

    public FeedbackController(FeedbackService service) {
        this.service = service;
    }

    @PostMapping
    public Map<String, Object> submit(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody Request request
    ) {
        service.submit(request.entry_id(), request.feedback(), user);
        return Map.of(
                "success", true,
                "data", Map.of("message", "Feedback submitted successfully")
        );
    }
}