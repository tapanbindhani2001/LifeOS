package com.lifeos.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on AiMessage entities.
 */
@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, UUID> {

    /**
     * Retrieves all messages belonging to a conversation session, sorted chronologically.
     *
     * @param conversationId the parent conversation UUID
     * @return sorted list of messages
     */
    List<AiMessage> findAllByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}
