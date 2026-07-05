package com.lifeos.ai;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.ai.dto.AiConversationResponse;
import com.lifeos.ai.dto.AiMessageResponse;
import com.lifeos.ai.dto.CreateConversationRequest;
import com.lifeos.ai.dto.CreateMessageRequest;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling AI chat session histories, message chains, and security scopes.
 */
@Service
public class AiService {

    private final AiConversationRepository aiConversationRepository;
    private final AiMessageRepository aiMessageRepository;

    /**
     * Constructs AiService.
     *
     * @param aiConversationRepository repository handling database chat sessions
     * @param aiMessageRepository      repository handling database messages logs
     */
    public AiService(
            AiConversationRepository aiConversationRepository,
            AiMessageRepository aiMessageRepository
    ) {
        this.aiConversationRepository = aiConversationRepository;
        this.aiMessageRepository = aiMessageRepository;
    }

    private AiConversationResponse mapToConversationResponse(AiConversation conv) {
        return AiConversationResponse.builder()
                .id(conv.getId())
                .title(conv.getTitle())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .build();
    }

    private AiMessageResponse mapToMessageResponse(AiMessage msg) {
        return AiMessageResponse.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt())
                .updatedAt(msg.getUpdatedAt())
                .build();
    }

    /**
     * Lists user AI chat conversations.
     *
     * @param user the currently authenticated user
     * @return sorted list of AiConversationResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<AiConversationResponse> getUserConversations(User user) {
        return aiConversationRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToConversationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new chat session.
     *
     * @param user    the currently authenticated user
     * @param request create conversation payload DTO
     * @return created AiConversationResponse DTO
     */
    @Transactional
    public AiConversationResponse createConversation(User user, CreateConversationRequest request) {
        AiConversation conv = AiConversation.builder()
                .user(user)
                .title(request.getTitle())
                .build();
        AiConversation saved = aiConversationRepository.save(conv);
        return mapToConversationResponse(saved);
    }

    /**
     * Lists messages belonging to a conversation session. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     * @return sorted chronological list of AiMessageResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<AiMessageResponse> getConversationMessages(User user, UUID conversationId) {
        // Assert ownership
        aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        return aiMessageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    /**
     * Appends a message log to an active chat session. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     * @param request        append message details DTO
     * @return created AiMessageResponse DTO
     */
    @Transactional
    public AiMessageResponse addMessageToConversation(User user, UUID conversationId, CreateMessageRequest request) {
        // Assert ownership
        AiConversation conv = aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        AiMessage message = AiMessage.builder()
                .conversation(conv)
                .role(request.getRole())
                .content(request.getContent())
                .build();

        AiMessage saved = aiMessageRepository.save(message);
        return mapToMessageResponse(saved);
    }

    /**
     * Deletes a chat session configuration and cascading messages. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     */
    @Transactional
    public void deleteConversation(User user, UUID conversationId) {
        AiConversation conv = aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));
        aiConversationRepository.delete(conv);
    }
}
