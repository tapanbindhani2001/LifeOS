package com.lifeos.goal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on Goal entities.
 */
@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    /**
     * Retrieves all goals belonging to a user, sorted to return uncompleted goals first,
     * then ordered by target date, and finally by creation time descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of goals
     */
    List<Goal> findAllByUserIdOrderByCompletedAscTargetDateAscCreatedAtDesc(UUID userId);

    /**
     * Finds a single goal matching goal ID and user ID to prevent unauthorized access.
     *
     * @param id     the goal UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Goal if found and matches owner, or empty
     */
    Optional<Goal> findByIdAndUserId(UUID id, UUID userId);
}
