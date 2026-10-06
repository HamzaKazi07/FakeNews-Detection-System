package com.fakenewsdetector.controller;

import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.service.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@AuthenticationPrincipal User user) {
        return Map.of(
                "success", true,
                "data", service.stats(user)
        );
    }
}