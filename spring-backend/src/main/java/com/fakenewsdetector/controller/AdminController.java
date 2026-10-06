package com.fakenewsdetector.controller;

import com.fakenewsdetector.dto.AdminDtos.ApiResponse;
import com.fakenewsdetector.dto.AdminDtos.AdminStats;
import com.fakenewsdetector.dto.AdminDtos.LogsData;
import com.fakenewsdetector.dto.AdminDtos.MessageData;
import com.fakenewsdetector.dto.AdminDtos.UsersData;
import com.fakenewsdetector.entity.User;
import com.fakenewsdetector.service.AdminService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService service;

    public AdminController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/users")
    public ApiResponse<UsersData> users() {
        return new ApiResponse<>(true, new UsersData(service.users()));
    }

    @DeleteMapping("/users/{userId}")
    public ApiResponse<MessageData> deleteUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser
    ) {
        service.deleteUser(userId, currentUser);
        return new ApiResponse<>(true, new MessageData("User deleted successfully."));
    }

    @GetMapping("/logs")
    public ApiResponse<LogsData> logs() {
        return new ApiResponse<>(true, new LogsData(service.logs()));
    }

    @DeleteMapping("/logs/{logId}")
    public ApiResponse<MessageData> deleteLog(@PathVariable Long logId) {
        service.deleteLog(logId);
        return new ApiResponse<>(true, new MessageData("Prediction history entry deleted."));
    }

    @GetMapping("/stats")
    public ApiResponse<AdminStats> stats() {
        return new ApiResponse<>(true, service.stats());
    }
}
