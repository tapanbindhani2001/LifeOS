package com.lifeos.ai.dto;

import com.lifeos.ai.MessageRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object capturing chat message details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMessageRequest {

    @NotNull(message = "Message role is required")
    private MessageRole role;

    @NotBlank(message = "Message content is required")
    private String content;
}
