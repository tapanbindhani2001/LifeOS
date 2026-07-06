package com.lifeos.expense;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.expense.dto.CreateExpenseRequest;
import com.lifeos.expense.dto.ExpenseResponse;
import com.lifeos.expense.dto.ExpenseSummaryResponse;
import com.lifeos.expense.dto.UpdateExpenseRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to view and manage user financial transactions.
 */
@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    /**
     * Constructs ExpenseController.
     *
     * @param expenseService service handling expense business rules
     */
    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /**
     * Retrieves all transactions belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing list of ExpenseResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<ExpenseResponse>> getExpenses(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<ExpenseResponse> response = expenseService.getUserExpenses(userDetails.getUser());
        return ApiResponse.success(response, "Fetched transactions successfully");
    }

    /**
     * Retrieves financial summary metrics and category groupings within a date range.
     *
     * @param userDetails Spring security principal wrapper
     * @param start       range start date (format: YYYY-MM-DD)
     * @param end         range end date (format: YYYY-MM-DD)
     * @return standard ApiResponse containing ExpenseSummaryResponse DTO
     */
    @GetMapping("/summary")
    public ApiResponse<ExpenseSummaryResponse> getSummary(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end
    ) {
        LocalDate startVal = start != null ? start : LocalDate.now().withDayOfMonth(1);
        LocalDate endVal = end != null ? end : LocalDate.now().plusMonths(1).withDayOfMonth(1).minusDays(1);
        ExpenseSummaryResponse response = expenseService.getExpenseSummary(userDetails.getUser(), startVal, endVal);
        return ApiResponse.success(response, "Fetched transaction summary successfully");
    }

    /**
     * Retrieves details of a specific transaction.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          expense UUID
     * @return standard ApiResponse containing ExpenseResponse DTO
     */
    @GetMapping("/{id}")
    public ApiResponse<ExpenseResponse> getExpenseById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        ExpenseResponse response = expenseService.getExpenseById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched transaction details successfully");
    }

    /**
     * Creates a new financial transaction (income or expense).
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create transaction payload DTO
     * @return standard ApiResponse containing created ExpenseResponse DTO
     */
    @PostMapping
    public ApiResponse<ExpenseResponse> createExpense(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateExpenseRequest request
    ) {
        ExpenseResponse response = expenseService.createExpense(userDetails.getUser(), request);
        return ApiResponse.success(response, "Transaction added successfully");
    }

    /**
     * Updates an existing financial transaction.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          expense UUID
     * @param request     update transaction payload DTO
     * @return standard ApiResponse containing updated ExpenseResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<ExpenseResponse> updateExpense(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateExpenseRequest request
    ) {
        ExpenseResponse response = expenseService.updateExpense(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Transaction updated successfully");
    }

    /**
     * Deletes a transaction.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          expense UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteExpense(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        expenseService.deleteExpense(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Transaction deleted successfully");
    }
}
