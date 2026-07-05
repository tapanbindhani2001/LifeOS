package com.lifeos.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on AiConversation entities.
 */
@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {

    /**
     * Retrieves all conversations belonging to a user, sorted by creation date descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of conversations
     */
    List<AiConversation> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Finds a single conversation matching conversation ID and user ID.
     *
     * @param id     the conversation UUID
     * @param userId the owner user UUID
     * @return an Optional containing the conversation if found and matches owner, or empty
     */
    Optional<AiConversation> findByIdAndUserId(UUID id, UUID userId);
}
