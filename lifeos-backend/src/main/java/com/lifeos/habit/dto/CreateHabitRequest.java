package com.lifeos.habit.dto;

import com.lifeos.habit.HabitFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object capturing habit creation parameters.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateHabitRequest {

    @NotBlank(message = "Habit name is required")
    private String name;

    private String description;

    @NotNull(message = "Frequency is required")
    private HabitFrequency frequency;
}
