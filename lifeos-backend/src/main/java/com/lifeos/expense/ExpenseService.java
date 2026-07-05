package com.lifeos.expense;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.expense.dto.*;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling expense list operations and financial aggregates.
 */
@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    /**
     * Constructs ExpenseService.
     *
     * @param expenseRepository repository handling database expense queries
     */
    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .type(expense.getType())
                .category(expense.getCategory())
                .description(expense.getDescription())
                .transactionDate(expense.getTransactionDate())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    /**
     * Lists user transactions ordered chronologically.
     *
     * @param user the currently authenticated user
     * @return list of ExpenseResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<ExpenseResponse> getUserExpenses(User user) {
        return expenseRepository.findAllByUserIdOrderByTransactionDateDescCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves detail profile of a specific transaction. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   expense UUID
     * @return ExpenseResponse DTO
     */
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(User user, UUID id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        return mapToResponse(expense);
    }

    /**
     * Calculates financial aggregates and category projections over a date range.
     *
     * @param user  the currently authenticated user
     * @param start range start date
     * @param end   range end date
     * @return ExpenseSummaryResponse containing aggregates
     */
    @Transactional(readOnly = true)
    public ExpenseSummaryResponse getExpenseSummary(User user, LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new BadRequestException("Start date must be before or equal to end date");
        }

        BigDecimal totalIncome = expenseRepository.sumAmountByTypeAndDateRange(user.getId(), ExpenseType.INCOME, start, end);
        BigDecimal totalExpense = expenseRepository.sumAmountByTypeAndDateRange(user.getId(), ExpenseType.EXPENSE, start, end);
        BigDecimal netBalance = totalIncome.subtract(totalExpense);

        List<CategorySum> categoryBreakdown = expenseRepository.sumByCategoryAndDateRange(user.getId(), ExpenseType.EXPENSE, start, end);

        return ExpenseSummaryResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(netBalance)
                .categoryBreakdown(categoryBreakdown)
                .build();
    }

    /**
     * Creates a new financial transaction.
     *
     * @param user    the currently authenticated user
     * @param request create transaction payload DTO
     * @return created ExpenseResponse DTO
     */
    @Transactional
    public ExpenseResponse createExpense(User user, CreateExpenseRequest request) {
        Expense expense = Expense.builder()
                .user(user)
                .amount(request.getAmount())
                .type(request.getType())
                .category(request.getCategory())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .build();

        Expense savedExpense = expenseRepository.save(expense);
        return mapToResponse(savedExpense);
    }

    /**
     * Updates an existing transaction. Secure user checked.
     *
     * @param user    the currently authenticated user
     * @param id      expense UUID
     * @param request update transaction payload DTO
     * @return updated ExpenseResponse DTO
     */
    @Transactional
    public ExpenseResponse updateExpense(User user, UUID id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        expense.setAmount(request.getAmount());
        expense.setType(request.getType());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setTransactionDate(request.getTransactionDate());

        Expense savedExpense = expenseRepository.save(expense);
        return mapToResponse(savedExpense);
    }

    /**
     * Deletes a transaction. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   expense UUID
     */
    @Transactional
    public void deleteExpense(User user, UUID id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        expenseRepository.delete(expense);
    }
}
