package com.lifeos.notification;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.notification.dto.NotificationResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to view, read, and delete user notifications.
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Constructs NotificationController.
     *
     * @param notificationService service handling notifications business rules
     */
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Retrieves all notifications belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing sorted list of NotificationResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<NotificationResponse> response = notificationService.getUserNotifications(userDetails.getUser());
        return ApiResponse.success(response, "Fetched notifications successfully");
    }

    /**
     * Retrieves total unread notifications count for badge display.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing unread count
     */
    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        long count = notificationService.getUnreadCount(userDetails.getUser());
        return ApiResponse.success(count, "Fetched unread count successfully");
    }

    /**
     * Marks a single notification as read.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          notification UUID
     * @return standard ApiResponse containing updated NotificationResponse DTO
     */
    @PostMapping("/{id}/read")
    public ApiResponse<NotificationResponse> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        NotificationResponse response = notificationService.markAsRead(userDetails.getUser(), id);
        return ApiResponse.success(response, "Notification marked as read successfully");
    }

    /**
     * Bulk marks all unread notifications belonging to the user as read.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse with success message
     */
    @PostMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAllAsRead(userDetails.getUser());
        return ApiResponse.successWithMessage("All notifications marked as read successfully");
    }

    /**
     * Deletes a notification.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          notification UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNotification(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        notificationService.deleteNotification(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Notification deleted successfully");
    }
}
