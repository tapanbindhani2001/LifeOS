package com.lifeos.tasks.dto;

import com.lifeos.tasks.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Data Transfer Object capturing task creation payload fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTaskRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private boolean completed;

    @NotNull(message = "Priority is required")
    private Priority priority;

    private String category;

    private Instant dueDate;
}
