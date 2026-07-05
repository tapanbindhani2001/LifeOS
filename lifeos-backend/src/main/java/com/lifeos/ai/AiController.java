package com.lifeos.ai;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.ai.dto.AiConversationResponse;
import com.lifeos.ai.dto.AiMessageResponse;
import com.lifeos.ai.dto.CreateConversationRequest;
import com.lifeos.ai.dto.CreateMessageRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to manage AI conversations, messages, and configurations.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;

    /**
     * Constructs AiController.
     *
     * @param aiService service handling AI chat business rules
     */
    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    /**
     * Retrieves all chat conversations belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing list of AiConversationResponse DTOs
     */
    @GetMapping("/conversations")
    public ApiResponse<List<AiConversationResponse>> getConversations(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<AiConversationResponse> response = aiService.getUserConversations(userDetails.getUser());
        return ApiResponse.success(response, "Fetched conversations successfully");
    }

    /**
     * Starts a new chat session.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create conversation payload DTO
     * @return standard ApiResponse containing created AiConversationResponse DTO
     */
    @PostMapping("/conversations")
    public ApiResponse<AiConversationResponse> createConversation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateConversationRequest request
    ) {
        AiConversationResponse response = aiService.createConversation(userDetails.getUser(), request);
        return ApiResponse.success(response, "Conversation created successfully");
    }

    /**
     * Retrieves the chronological message log for a chat session.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          conversation UUID
     * @return standard ApiResponse containing sorted list of AiMessageResponse DTOs
     */
    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<List<AiMessageResponse>> getMessages(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        List<AiMessageResponse> response = aiService.getConversationMessages(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched conversation messages successfully");
    }

    /**
     * Appends a message log entry to a chat session.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          conversation UUID
     * @param request     append message payload DTO
     * @return standard ApiResponse containing created AiMessageResponse DTO
     */
    @PostMapping("/conversations/{id}/messages")
    public ApiResponse<AiMessageResponse> addMessage(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        AiMessageResponse response = aiService.addMessageToConversation(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Message added successfully");
    }

    /**
     * Deletes a chat session and cascades cleanup on messages.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          conversation UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> deleteConversation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        aiService.deleteConversation(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Conversation deleted successfully");
    }
}
