package com.lifeos.calendar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and scheduling queries on CalendarEvent entities.
 */
@Repository
public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    /**
     * Retrieves all events belonging to a user, sorted chronologically.
     *
     * @param userId the owner user UUID
     * @return sorted list of events
     */
    List<CalendarEvent> findAllByUserIdOrderByStartTimeAsc(UUID userId);

    /**
     * Retrieves all events belonging to a user within a specified time range, sorted chronologically.
     *
     * @param userId the owner user UUID
     * @param start  range start timestamp
     * @param end    range end timestamp
     * @return sorted list of events within the range
     */
    List<CalendarEvent> findAllByUserIdAndStartTimeBetweenOrderByStartTimeAsc(UUID userId, Instant start, Instant end);

    /**
     * Finds a single event matching the event ID and owning user ID to prevent unauthorized access.
     *
     * @param id     the event UUID
     * @param userId the owner user UUID
     * @return an Optional containing the CalendarEvent if found and matches owner, or empty
     */
    Optional<CalendarEvent> findByIdAndUserId(UUID id, UUID userId);
}
