package com.lifeos.document;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on Document configurations.
 */
@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    /**
     * Retrieves all documents belonging to a user, ordered by creation date descending.
     *
     * @param userId the owner user UUID
     * @return sorted list of documents
     */
    List<Document> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Finds a single document matching the configuration ID and owning user ID.
     *
     * @param id     the document UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Document if found and matches owner, or empty
     */
    Optional<Document> findByIdAndUserId(UUID id, UUID userId);
}
