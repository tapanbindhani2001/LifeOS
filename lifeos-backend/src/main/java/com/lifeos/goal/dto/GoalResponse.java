package com.lifeos.goal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Data Transfer Object presenting user goal details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalResponse {
    private UUID id;
    private String title;
    private String description;
    private LocalDate targetDate;
    private int progress;
    private boolean completed;
    private Instant createdAt;
    private Instant updatedAt;
}
