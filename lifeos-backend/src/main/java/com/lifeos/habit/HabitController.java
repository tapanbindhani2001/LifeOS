package com.lifeos.habit;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.habit.dto.CreateHabitRequest;
import com.lifeos.habit.dto.HabitResponse;
import com.lifeos.habit.dto.UpdateHabitRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to manage user habits, configurations, and check-ins.
 */
@RestController
@RequestMapping("/api/v1/habits")
public class HabitController {

    private final HabitService habitService;

    /**
     * Constructs HabitController.
     *
     * @param habitService service handling habits business rules
     */
    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    /**
     * Retrieves all habits belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing list of HabitResponse DTOs (including streak counts)
     */
    @GetMapping
    public ApiResponse<List<HabitResponse>> getHabits(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<HabitResponse> response = habitService.getUserHabits(userDetails.getUser());
        return ApiResponse.success(response, "Fetched habits successfully");
    }

    /**
     * Creates a new habit configuration.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create habit payload DTO
     * @return standard ApiResponse containing created HabitResponse DTO
     */
    @PostMapping
    public ApiResponse<HabitResponse> createHabit(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateHabitRequest request
    ) {
        HabitResponse response = habitService.createHabit(userDetails.getUser(), request);
        return ApiResponse.success(response, "Habit created successfully");
    }

    /**
     * Updates an existing habit configuration.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          habit UUID
     * @param request     update habit payload DTO
     * @return standard ApiResponse containing updated HabitResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<HabitResponse> updateHabit(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateHabitRequest request
    ) {
        HabitResponse response = habitService.updateHabit(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Habit updated successfully");
    }

    /**
     * Toggles a habit's completion log for a specific date.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          habit UUID
     * @param date        optional target check-in date (format: YYYY-MM-DD, defaults to today)
     * @return standard ApiResponse containing updated HabitResponse DTO
     */
    @PostMapping("/{id}/toggle")
    public ApiResponse<HabitResponse> toggleHabit(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate toggleDate = (date != null) ? date : LocalDate.now();
        HabitResponse response = habitService.toggleHabit(userDetails.getUser(), id, toggleDate);
        return ApiResponse.success(response, "Habit status toggled successfully");
    }

    /**
     * Deletes a habit configuration.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          habit UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteHabit(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        habitService.deleteHabit(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Habit deleted successfully");
    }
}
