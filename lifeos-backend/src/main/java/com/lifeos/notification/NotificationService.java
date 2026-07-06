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
    private final com.lifeos.calendar.CalendarEventRepository calendarEventRepository;

    /**
     * Constructs NotificationService.
     *
     * @param notificationRepository repository handling database notifications queries
     * @param calendarEventRepository repository handling calendar events queries
     */
    public NotificationService(NotificationRepository notificationRepository, com.lifeos.calendar.CalendarEventRepository calendarEventRepository) {
        this.notificationRepository = notificationRepository;
        this.calendarEventRepository = calendarEventRepository;
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
     * Helper method to generate event reminder notifications dynamically on demand
     * based on active calendar events and current time conditions.
     */
    @Transactional
    public void generateEventReminders(User user) {
        java.time.ZoneId zone = java.time.ZoneId.systemDefault();
        java.time.ZonedDateTime nowTime = java.time.Instant.now().atZone(zone);

        List<com.lifeos.calendar.CalendarEvent> events = calendarEventRepository.findAllByUserIdOrderByStartTimeAsc(user.getId());
        for (com.lifeos.calendar.CalendarEvent event : events) {
            java.time.Instant startInstant = event.getStartTime();
            if (startInstant == null) continue;

            java.time.ZonedDateTime eventTime = startInstant.atZone(zone);
            java.time.ZonedDateTime eventCreatedTime = event.getCreatedAt() != null 
                    ? event.getCreatedAt().atZone(zone) 
                    : eventTime.minusDays(7);

            // 1. Alarm 1 (1 Day Before)
            java.time.ZonedDateTime alarm1Time = eventTime.minusDays(1);
            if (alarm1Time.isAfter(eventCreatedTime) && (nowTime.isAfter(alarm1Time) || nowTime.equals(alarm1Time))) {
                String title = "[Reminder] Event Tomorrow: " + event.getTitle();
                if (!notificationRepository.existsByUserIdAndTitle(user.getId(), title)) {
                    Notification notif = Notification.builder()
                            .user(user)
                            .title(title)
                            .message("Your event \"" + event.getTitle() + "\" is scheduled for tomorrow.")
                            .type(NotificationType.REMINDER)
                            .read(false)
                            .build();
                    notificationRepository.save(notif);
                }
            }

            // 2. Alarm 2 (Morning on the Day - 9:00 AM)
            java.time.ZonedDateTime alarm2Time = eventTime.withHour(9).withMinute(0).withSecond(0);
            if (alarm2Time.isAfter(eventCreatedTime) && (nowTime.isAfter(alarm2Time) || nowTime.equals(alarm2Time))) {
                String title = "[Morning Alert] Today's Event: " + event.getTitle();
                if (!notificationRepository.existsByUserIdAndTitle(user.getId(), title)) {
                    Notification notif = Notification.builder()
                            .user(user)
                            .title(title)
                            .message("Good morning! You have \"" + event.getTitle() + "\" scheduled for today.")
                            .type(NotificationType.REMINDER)
                            .read(false)
                            .build();
                    notificationRepository.save(notif);
                }
            }

            // 3. Alarm 3 (Afternoon on the Day - 2:00 PM)
            java.time.ZonedDateTime alarm3Time = eventTime.withHour(14).withMinute(0).withSecond(0);
            if (alarm3Time.isAfter(eventCreatedTime) && (nowTime.isAfter(alarm3Time) || nowTime.equals(alarm3Time))) {
                String title = "[Afternoon Alert] Event Today: " + event.getTitle();
                if (!notificationRepository.existsByUserIdAndTitle(user.getId(), title)) {
                    Notification notif = Notification.builder()
                            .user(user)
                            .title(title)
                            .message("Good afternoon! Reminder: \"" + event.getTitle() + "\" is scheduled for today.")
                            .type(NotificationType.REMINDER)
                            .read(false)
                            .build();
                    notificationRepository.save(notif);
                }
            }

            // 4. Alarm 4 (Evening on the Day - 7:00 PM)
            java.time.ZonedDateTime alarm4Time = eventTime.withHour(19).withMinute(0).withSecond(0);
            if (alarm4Time.isAfter(eventCreatedTime) && (nowTime.isAfter(alarm4Time) || nowTime.equals(alarm4Time))) {
                String title = "[Evening Alert] Event Tonight: " + event.getTitle();
                if (!notificationRepository.existsByUserIdAndTitle(user.getId(), title)) {
                    Notification notif = Notification.builder()
                            .user(user)
                            .title(title)
                            .message("Good evening! Reminder: \"" + event.getTitle() + "\" is scheduled for tonight.")
                            .type(NotificationType.REMINDER)
                            .read(false)
                            .build();
                    notificationRepository.save(notif);
                }
            }
        }
    }

    /**
     * Lists user notifications (unread first, then sorted by creation date descending).
     *
     * @param user the currently authenticated user
     * @return sorted list of NotificationResponse DTOs
     */
    @Transactional
    public List<NotificationResponse> getUserNotifications(User user) {
        generateEventReminders(user);
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
    @Transactional
    public long getUnreadCount(User user) {
        generateEventReminders(user);
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
     * Deletes a notification securely checking user ownership bounds.
     *
     * @param user owner user
     * @param id   notification UUID
     */
    @Transactional
    public void deleteNotification(User user, UUID id) {
        Notification notif = notificationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notificationRepository.delete(notif);
    }
}
