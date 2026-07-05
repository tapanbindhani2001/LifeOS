package com.lifeos.notes;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA Repository interface for performing CRUD operations on Note entities.
 */
@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    /**
     * Retrieves all notes belonging to a specific user, sorted to return pinned notes first,
     * followed by notes ordered by creation time in descending order.
     *
     * @param userId the owner user UUID
     * @return sorted list of notes
     */
    List<Note> findAllByUserIdOrderByPinnedDescCreatedAtDesc(UUID userId);

    /**
     * Finds a single note matching the note ID and owning user ID to prevent unauthorized access.
     *
     * @param id     the note UUID
     * @param userId the owner user UUID
     * @return an Optional containing the Note if found and matches owner, or empty
     */
    Optional<Note> findByIdAndUserId(UUID id, UUID userId);
}
