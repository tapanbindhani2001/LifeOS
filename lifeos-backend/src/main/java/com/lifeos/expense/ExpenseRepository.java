package com.lifeos.expense;

import com.lifeos.expense.dto.CategorySum;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD and financial queries on Expense entities.
 */
@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    /**
     * Retrieves all transactions belonging to a user, sorted by transaction date descending, then creation date.
     *
     * @param userId the owner user UUID
     * @return sorted list of expenses
     */
    List<Expense> findAllByUserIdOrderByTransactionDateDescCreatedAtDesc(UUID userId);

    /**
     * Finds a single transaction matching transaction ID and user ID to prevent unauthorized access.
     *
     * @param id     the expense UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Expense if found and matches owner, or empty
     */
    Optional<Expense> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Sums transaction amounts by type (INCOME or EXPENSE) within a date range.
     *
     * @param userId the owner user UUID
     * @param type   transaction type (INCOME or EXPENSE)
     * @param start  range start date
     * @param end    range end date
     * @return the total sum of matching transactions (or 0 if none)
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e " +
           "WHERE e.user.id = :userId AND e.type = :type " +
           "AND e.transactionDate BETWEEN :start AND :end")
    BigDecimal sumAmountByTypeAndDateRange(@Param("userId") UUID userId, @Param("type") ExpenseType type,
                                           @Param("start") LocalDate start, @Param("end") LocalDate end);

    /**
     * Groups transaction sums by category within a date range for analytics charts.
     *
     * @param userId the owner user UUID
     * @param type   transaction type (INCOME or EXPENSE)
     * @param start  range start date
     * @param end    range end date
     * @return list of CategorySum projection DTOs
     */
    @Query("SELECT new com.lifeos.expense.dto.CategorySum(e.category, SUM(e.amount)) " +
           "FROM Expense e " +
           "WHERE e.user.id = :userId AND e.type = :type " +
           "AND e.transactionDate BETWEEN :start AND :end " +
           "GROUP BY e.category")
    List<CategorySum> sumByCategoryAndDateRange(@Param("userId") UUID userId, @Param("type") ExpenseType type,
                                                @Param("start") LocalDate start, @Param("end") LocalDate end);

    /**
     * Retrieves all transactions within a date range for the given user, used for monthly trend aggregation.
     *
     * @param userId the owner user UUID
     * @param start  range start date
     * @param end    range end date
     * @return list of matching expense entities
     */
    @Query("SELECT e FROM Expense e " +
           "WHERE e.user.id = :userId " +
           "AND e.transactionDate BETWEEN :start AND :end " +
           "ORDER BY e.transactionDate ASC")
    List<Expense> findAllByUserIdAndDateRange(@Param("userId") UUID userId,
                                              @Param("start") LocalDate start,
                                              @Param("end") LocalDate end);

    /**
     * Looks up an existing auto-imported SMS transaction by its Android message ID.
     * Used for idempotent SMS import: if found, skip insertion.
     *
     * @param userId        the owner user UUID
     * @param smsExternalId Android sms._id string
     * @return Optional of the existing Expense if already imported
     */
    Optional<Expense> findByUserIdAndSmsExternalId(UUID userId, String smsExternalId);
}
