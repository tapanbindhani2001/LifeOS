package com.lifeos.budget;

import com.lifeos.budget.dto.BudgetResponse;
import com.lifeos.budget.dto.UpsertBudgetRequest;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.expense.ExpenseRepository;
import com.lifeos.expense.ExpenseType;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling budget creation, updates, deletion, and real-time enrichment with actuals.
 */
@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;

    /**
     * Constructs BudgetService.
     *
     * @param budgetRepository  repository handling budget CRUD
     * @param expenseRepository repository used to query current month actuals
     */
    public BudgetService(BudgetRepository budgetRepository, ExpenseRepository expenseRepository) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }

    private BudgetResponse enrich(Budget budget, User user) {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());

        // Filter to this category only using a dedicated query
        BigDecimal categorySpent = expenseRepository
                .sumByCategoryAndDateRange(user.getId(), ExpenseType.EXPENSE, monthStart, monthEnd)
                .stream()
                .filter(cs -> cs.getCategory().equalsIgnoreCase(budget.getCategory()))
                .map(com.lifeos.expense.dto.CategorySum::getAmount)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        BigDecimal limit = budget.getMonthlyLimit();
        double pct = limit.compareTo(BigDecimal.ZERO) > 0
                ? categorySpent.divide(limit, 4, RoundingMode.HALF_UP).doubleValue() * 100.0
                : 0.0;

        String status;
        if (pct >= 100.0) {
            status = "OVER_BUDGET";
        } else if (pct >= 80.0) {
            status = "WARNING";
        } else {
            status = "ON_TRACK";
        }

        return BudgetResponse.builder()
                .id(budget.getId())
                .category(budget.getCategory())
                .monthlyLimit(limit)
                .spent(categorySpent)
                .percentage(Math.round(pct * 10.0) / 10.0)
                .status(status)
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }

    /**
     * Lists all budgets for the user, enriched with current month actual spending.
     *
     * @param user the currently authenticated user
     * @return list of enriched BudgetResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<BudgetResponse> getBudgets(User user) {
        return budgetRepository.findAllByUserIdOrderByCategory(user.getId())
                .stream()
                .map(b -> enrich(b, user))
                .collect(Collectors.toList());
    }

    /**
     * Creates a new budget or updates existing one for the category (upsert).
     *
     * @param user    the currently authenticated user
     * @param request upsert budget payload DTO
     * @return enriched BudgetResponse DTO
     */
    @Transactional
    public BudgetResponse upsertBudget(User user, UpsertBudgetRequest request) {
        Budget budget = budgetRepository
                .findByUserIdAndCategory(user.getId(), request.getCategory().toUpperCase())
                .orElse(Budget.builder()
                        .user(user)
                        .category(request.getCategory().toUpperCase())
                        .build());

        budget.setMonthlyLimit(request.getMonthlyLimit());
        Budget saved = budgetRepository.save(budget);
        return enrich(saved, user);
    }

    /**
     * Deletes a budget limit. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   budget UUID
     */
    @Transactional
    public void deleteBudget(User user, UUID id) {
        Budget budget = budgetRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found with id: " + id));
        budgetRepository.delete(budget);
    }
}
