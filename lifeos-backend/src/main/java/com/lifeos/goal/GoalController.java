package com.lifeos.goal;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.goal.dto.CreateGoalRequest;
import com.lifeos.goal.dto.GoalResponse;
import com.lifeos.goal.dto.UpdateGoalRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to create, view, modify, and delete user goals.
 */
@RestController
@RequestMapping("/api/v1/goals")
public class GoalController {

    private final GoalService goalService;

    /**
     * Constructs GoalController.
     *
     * @param goalService service handling goals business rules
     */
    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    /**
     * Retrieves all goals belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing sorted list of GoalResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<GoalResponse>> getGoals(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<GoalResponse> response = goalService.getUserGoals(userDetails.getUser());
        return ApiResponse.success(response, "Fetched goals successfully");
    }

    /**
     * Retrieves details of a specific goal.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          goal UUID
     * @return standard ApiResponse containing GoalResponse DTO
     */
    @GetMapping("/{id}")
    public ApiResponse<GoalResponse> getGoalById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        GoalResponse response = goalService.getGoalById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched goal successfully");
    }

    /**
     * Creates a new goal.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create goal payload DTO
     * @return standard ApiResponse containing created GoalResponse DTO
     */
    @PostMapping
    public ApiResponse<GoalResponse> createGoal(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateGoalRequest request
    ) {
        GoalResponse response = goalService.createGoal(userDetails.getUser(), request);
        return ApiResponse.success(response, "Goal created successfully");
    }

    /**
     * Updates an existing goal configuration and progress.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          goal UUID
     * @param request     update goal payload DTO
     * @return standard ApiResponse containing updated GoalResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<GoalResponse> updateGoal(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateGoalRequest request
    ) {
        GoalResponse response = goalService.updateGoal(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Goal updated successfully");
    }

    /**
     * Deletes a goal.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          goal UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteGoal(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        goalService.deleteGoal(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Goal deleted successfully");
    }
}
