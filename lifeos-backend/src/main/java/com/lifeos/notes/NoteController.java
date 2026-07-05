package com.lifeos.notes;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.notes.dto.CreateNoteRequest;
import com.lifeos.notes.dto.NoteResponse;
import com.lifeos.notes.dto.UpdateNoteRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to create, read, update, delete, and pin user personal notes.
 */
@RestController
@RequestMapping("/api/v1/notes")
public class NoteController {

    private final NoteService noteService;

    /**
     * Constructs NoteController.
     *
     * @param noteService service handling notes business rules
     */
    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    /**
     * Retrieves all notes belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing sorted list of NoteResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<NoteResponse>> getNotes(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<NoteResponse> response = noteService.getUserNotes(userDetails.getUser());
        return ApiResponse.success(response, "Fetched notes successfully");
    }

    /**
     * Retrieves details of a specific note.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          note UUID
     * @return standard ApiResponse containing NoteResponse DTO
     */
    @GetMapping("/{id}")
    public ApiResponse<NoteResponse> getNoteById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        NoteResponse response = noteService.getNoteById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched note successfully");
    }

    /**
     * Creates a new note.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create note payload DTO
     * @return standard ApiResponse containing created NoteResponse DTO
     */
    @PostMapping
    public ApiResponse<NoteResponse> createNote(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateNoteRequest request
    ) {
        NoteResponse response = noteService.createNote(userDetails.getUser(), request);
        return ApiResponse.success(response, "Note created successfully");
    }

    /**
     * Updates an existing note.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          note UUID
     * @param request     update note payload DTO
     * @return standard ApiResponse containing updated NoteResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<NoteResponse> updateNote(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNoteRequest request
    ) {
        NoteResponse response = noteService.updateNote(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Note updated successfully");
    }

    /**
     * Toggles pin status of a note.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          note UUID
     * @return standard ApiResponse containing updated NoteResponse DTO
     */
    @PutMapping("/{id}/pin")
    public ApiResponse<NoteResponse> togglePin(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        NoteResponse response = noteService.togglePin(userDetails.getUser(), id);
        return ApiResponse.success(response, "Note pin toggled successfully");
    }

    /**
     * Deletes a note.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          note UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteNote(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        noteService.deleteNote(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Note deleted successfully");
    }
}
