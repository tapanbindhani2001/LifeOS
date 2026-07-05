package com.lifeos.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object presenting user AI conversation session details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationResponse {
    private UUID id;
    private String title;
    private Instant createdAt;
    private Instant updatedAt;
}
