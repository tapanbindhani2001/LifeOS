package com.lifeos.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and query operations on Notification entities.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Retrieves all notifications belonging to a user, sorted to return unread first,
     * then ordered by creation date descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of notifications
     */
    List<Notification> findAllByUserIdOrderByReadAscCreatedAtDesc(UUID userId);

    /**
     * Checks if a notification with specific title already exists for a user.
     *
     * @param userId owner user ID
     * @param title  notification title
     * @return true if exists, false otherwise
     */
    boolean existsByUserIdAndTitle(UUID userId, String title);

    /**
     * Counts the total number of unread notifications for a user (for UI badge updates).
     *
     * @param userId the owner user UUID
     * @return total count of unread notifications
     */
    long countByUserIdAndReadFalse(UUID userId);

    /**
     * Finds a single notification matching ID and user ID to prevent cross-tenant operations.
     *
     * @param id     the notification UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Notification if found and matches owner, or empty
     */
    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Bulk updates all unread notifications for a user to read state.
     * High-performance database operations executed as a single query.
     *
     * @param userId the owner user UUID
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    void markAllAsReadForUser(@Param("userId") UUID userId);
}
