package com.lifeos.habit.dto;

import com.lifeos.habit.HabitFrequency;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object presenting habit details, completion statuses, and computed streaks.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitResponse {
    private UUID id;
    private String name;
    private String description;
    private HabitFrequency frequency;
    private boolean completedToday;
    private int currentStreak;
    private int bestStreak;
    private Instant createdAt;
    private Instant updatedAt;
}
