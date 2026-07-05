package com.lifeos.habit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and queries on HabitLog entries.
 */
@Repository
public interface HabitLogRepository extends JpaRepository<HabitLog, UUID> {

    /**
     * Retrieves all completion logs for a habit sorted by date descending.
     *
     * @param habitId the habit UUID
     * @return sorted list of habit logs
     */
    List<HabitLog> findAllByHabitIdOrderByDateDesc(UUID habitId);

    /**
     * Finds a completion log for a specific date and habit.
     *
     * @param habitId the habit UUID
     * @param date    the check-in date
     * @return an Optional containing the HabitLog if logged, or empty
     */
    Optional<HabitLog> findByHabitIdAndDate(UUID habitId, LocalDate date);
}
