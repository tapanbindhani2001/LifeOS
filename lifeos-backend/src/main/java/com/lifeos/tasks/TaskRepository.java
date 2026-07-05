package com.lifeos.tasks;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and queries on Task entities.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    /**
     * Retrieves all tasks belonging to a specific user, sorted to return uncompleted tasks first,
     * then ordered by due date, and finally by creation time descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of tasks
     */
    List<Task> findAllByUserIdOrderByCompletedAscDueDateAscCreatedAtDesc(UUID userId);

    /**
     * Finds a single task matching the task ID and owning user ID to prevent unauthorized access.
     *
     * @param id     the task UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Task if found and matches owner, or empty
     */
    Optional<Task> findByIdAndUserId(UUID id, UUID userId);
}
