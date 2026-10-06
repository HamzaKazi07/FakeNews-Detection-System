package com.fakenewsdetector.controller;

import com.fakenewsdetector.service.LiveNewsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LiveNewsController {

    private final LiveNewsService service;

    public LiveNewsController(LiveNewsService service) {
        this.service = service;
    }

    @GetMapping("/api/live-news")
    public LiveNewsService.LiveNewsResponse liveNews() {
        return service.getLiveNews();
    }
}
