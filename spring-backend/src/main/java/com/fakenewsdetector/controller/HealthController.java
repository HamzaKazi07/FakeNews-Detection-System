package com.fakenewsdetector.controller;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
  @GetMapping({"/health", "/api/health"})
  public ResponseEntity<Map<String, Object>> health() {
    return ResponseEntity.ok(Map.of("status", "UP", "timestamp", Instant.now().toString()));
  }
}
