package com.lifeos.notes;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.notes.dto.CreateNoteRequest;
import com.lifeos.notes.dto.NoteResponse;
import com.lifeos.notes.dto.UpdateNoteRequest;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling all note-management business rules (creation, update, list, delete, pin toggles).
 */
@Service
public class NoteService {

    private final NoteRepository noteRepository;

    /**
     * Constructs a NoteService.
     *
     * @param noteRepository repository handling database notes queries
     */
    public NoteService(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    private NoteResponse mapToNoteResponse(Note note) {
        return NoteResponse.builder()
                .id(note.getId())
                .title(note.getTitle())
                .content(note.getContent())
                .pinned(note.isPinned())
                .color(note.getColor())
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }

    /**
     * Fetches all notes belonging to the authenticated user, sorted by pinned first, then creation date.
     *
     * @param user the currently authenticated user
     * @return sorted list of NoteResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<NoteResponse> getUserNotes(User user) {
        return noteRepository.findAllByUserIdOrderByPinnedDescCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToNoteResponse)
                .collect(Collectors.toList());
    }

    /**
     * Fetches a specific note. Enforces security boundary by ensuring user ownership.
     *
     * @param user   the currently authenticated user
     * @param noteId the note UUID
     * @return NoteResponse DTO
     */
    @Transactional(readOnly = true)
    public NoteResponse getNoteById(User user, UUID noteId) {
        Note note = noteRepository.findByIdAndUserId(noteId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));
        return mapToNoteResponse(note);
    }

    /**
     * Creates a new note.
     *
     * @param user    the currently authenticated user
     * @param request the create payload
     * @return the created NoteResponse DTO
     */
    @Transactional
    public NoteResponse createNote(User user, CreateNoteRequest request) {
        Note note = Note.builder()
                .user(user)
                .title(request.getTitle())
                .content(request.getContent())
                .pinned(request.isPinned())
                .color(request.getColor())
                .build();

        Note savedNote = noteRepository.save(note);
        return mapToNoteResponse(savedNote);
    }

    /**
     * Updates an existing note. Enforces security boundary.
     *
     * @param user    the currently authenticated user
     * @param noteId  the note UUID
     * @param request the update payload
     * @return the updated NoteResponse DTO
     */
    @Transactional
    public NoteResponse updateNote(User user, UUID noteId, UpdateNoteRequest request) {
        Note note = noteRepository.findByIdAndUserId(noteId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));

        note.setTitle(request.getTitle());
        note.setContent(request.getContent());
        note.setPinned(request.isPinned());
        if (request.getColor() != null) {
            note.setColor(request.getColor());
        }

        Note savedNote = noteRepository.save(note);
        return mapToNoteResponse(savedNote);
    }

    /**
     * Toggles the pinned status of a note. Enforces security boundary.
     *
     * @param user   the currently authenticated user
     * @param noteId the note UUID
     * @return the updated NoteResponse DTO
     */
    @Transactional
    public NoteResponse togglePin(User user, UUID noteId) {
        Note note = noteRepository.findByIdAndUserId(noteId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));

        note.setPinned(!note.isPinned());
        Note savedNote = noteRepository.save(note);
        return mapToNoteResponse(savedNote);
    }

    /**
     * Deletes a note. Enforces security boundary.
     *
     * @param user   the currently authenticated user
     * @param noteId the note UUID
     */
    @Transactional
    public void deleteNote(User user, UUID noteId) {
        Note note = noteRepository.findByIdAndUserId(noteId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with id: " + noteId));
        noteRepository.delete(note);
    }
}
