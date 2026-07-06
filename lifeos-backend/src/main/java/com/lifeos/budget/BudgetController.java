package com.lifeos.budget;

import com.lifeos.budget.dto.BudgetResponse;
import com.lifeos.budget.dto.UpsertBudgetRequest;
import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to manage monthly category budgets.
 */
@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    /**
     * Constructs BudgetController.
     *
     * @param budgetService service handling budget business rules
     */
    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    /**
     * Retrieves all budgets for the authenticated user, enriched with current month actuals.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing list of BudgetResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<BudgetResponse>> getBudgets(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<BudgetResponse> budgets = budgetService.getBudgets(userDetails.getUser());
        return ApiResponse.success(budgets, "Budgets retrieved successfully");
    }

    /**
     * Creates or updates a category budget limit (upsert).
     *
     * @param userDetails Spring security principal wrapper
     * @param request     upsert budget payload DTO
     * @return standard ApiResponse containing the saved BudgetResponse DTO
     */
    @PostMapping
    public ApiResponse<BudgetResponse> upsertBudget(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UpsertBudgetRequest request) {
        BudgetResponse response = budgetService.upsertBudget(userDetails.getUser(), request);
        return ApiResponse.success(response, "Budget saved successfully");
    }

    /**
     * Deletes a budget limit by id.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          budget UUID path variable
     * @return standard ApiResponse with void data
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteBudget(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id) {
        budgetService.deleteBudget(userDetails.getUser(), id);
        return ApiResponse.success(null, "Budget deleted successfully");
    }
}
