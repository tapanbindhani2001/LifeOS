package com.lifeos.notification;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.notification.dto.NotificationResponse;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling user notifications listing, unread badge counts, read toggling, and bulk updates.
 */
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * Constructs NotificationService.
     *
     * @param notificationRepository repository handling database notifications queries
     */
    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    private NotificationResponse mapToResponse(Notification notif) {
        return NotificationResponse.builder()
                .id(notif.getId())
                .title(notif.getTitle())
                .message(notif.getMessage())
                .read(notif.isRead())
                .type(notif.getType())
                .createdAt(notif.getCreatedAt())
                .updatedAt(notif.getUpdatedAt())
                .build();
    }

    /**
     * Lists user notifications (unread first, then sorted by creation date descending).
     *
     * @param user the currently authenticated user
     * @return sorted list of NotificationResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(User user) {
        return notificationRepository.findAllByUserIdOrderByReadAscCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves total unread notifications count for badge display.
     *
     * @param user the currently authenticated user
     * @return count of unread notifications
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(User user) {
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    /**
     * Marks a single notification as read. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   notification UUID
     * @return updated NotificationResponse DTO
     */
    @Transactional
    public NotificationResponse markAsRead(User user, UUID id) {
        Notification notif = notificationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notif.setRead(true);
        Notification savedNotif = notificationRepository.save(notif);
        return mapToResponse(savedNotif);
    }

    /**
     * Bulk marks all unread notifications belonging to the user as read.
     * High-performance database operations executed as a single query.
     *
     * @param user the currently authenticated user
     */
    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsReadForUser(user.getId());
    }

    /**
     * Deletes a notification configuration. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   notification UUID
     */
    @Transactional
    public void deleteNotification(User user, UUID id) {
        Notification notif = notificationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notificationRepository.delete(notif);
    }
}
