package com.lifeos.habit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on Habit configurations.
 */
@Repository
public interface HabitRepository extends JpaRepository<Habit, UUID> {

    /**
     * Retrieves all habits belonging to a user, ordered by creation date descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of habits
     */
    List<Habit> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Finds a single habit matching the configuration ID and owning user ID.
     *
     * @param id     the habit UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Habit if found and matches owner, or empty
     */
    Optional<Habit> findByIdAndUserId(UUID id, UUID userId);
}
