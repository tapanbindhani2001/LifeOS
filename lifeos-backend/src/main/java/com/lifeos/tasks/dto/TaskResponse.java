package com.lifeos.tasks.dto;

import com.lifeos.tasks.Priority;
import com.lifeos.tasks.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object presenting sanitized task details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private boolean completed;
    private Priority priority;
    private TaskStatus status;
    private String category;
    private Instant dueDate;
    private Instant createdAt;
    private Instant updatedAt;
}
