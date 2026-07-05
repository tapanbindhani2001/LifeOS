package com.lifeos.ai.dto;

import com.lifeos.ai.MessageRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object presenting user AI message log details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiMessageResponse {
    private UUID id;
    private MessageRole role;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;
}
