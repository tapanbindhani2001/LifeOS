package com.lifeos.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository for Budget entity CRUD operations.
 */
@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    /**
     * Retrieves all budgets for a given user.
     *
     * @param userId the owner user UUID
     * @return list of Budget entities
     */
    List<Budget> findAllByUserIdOrderByCategory(UUID userId);

    /**
     * Finds a budget by user and category for upsert logic.
     *
     * @param userId   the owner user UUID
     * @param category the expense category string
     * @return optional Budget entity
     */
    Optional<Budget> findByUserIdAndCategory(UUID userId, String category);

    /**
     * Finds a budget by id and user for ownership checks.
     *
     * @param id     the budget UUID
     * @param userId the owner user UUID
     * @return optional Budget entity
     */
    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);
}
