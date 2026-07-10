package com.lifeos.document;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.document.dto.DocumentResponse;
import com.lifeos.document.dto.StorageSummaryResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to upload, download, list, and delete documents.
 */
@RestController
@RequestMapping("/api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Constructs DocumentController.
     *
     * @param documentService service handling document business rules
     */
    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    /**
     * Retrieves all documents belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing list of DocumentResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<DocumentResponse>> getDocuments(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<DocumentResponse> response = documentService.getUserDocuments(userDetails.getUser());
        return ApiResponse.success(response, "Fetched documents successfully");
    }

    /**
     * Retrieves the storage summary (used vs limit) for the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing StorageSummaryResponse DTO
     */
    @GetMapping("/storage")
    public ApiResponse<StorageSummaryResponse> getStorageSummary(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        StorageSummaryResponse response = documentService.getStorageSummary(userDetails.getUser());
        return ApiResponse.success(response, "Fetched storage summary successfully");
    }

    /**
     * Retrieves details of a specific document.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          document UUID
     * @return standard ApiResponse containing DocumentResponse DTO
     */
    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    public ApiResponse<DocumentResponse> getDocumentById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        DocumentResponse response = documentService.getDocumentById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched document details successfully");
    }

    /**
     * Uploads a document asset.
     *
     * @param userDetails Spring security principal wrapper
     * @param file        uploaded multipart file
     * @param scanned     scanned status flag (defaults to false)
     * @return standard ApiResponse containing uploaded DocumentResponse DTO
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<DocumentResponse> uploadDocument(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "scanned", defaultValue = "false") boolean scanned
    ) {
        DocumentResponse response = documentService.uploadDocument(userDetails.getUser(), file, scanned);
        return ApiResponse.success(response, "Document uploaded successfully");
    }

    /**
     * Downloads an uploaded document file resource stream.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          document UUID
     * @return ResponseEntity holding the Resource stream along with standard attachment headers
     */
    @GetMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}/download")
    public ResponseEntity<Resource> downloadDocument(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        DocumentResponse details = documentService.getDocumentById(userDetails.getUser(), id);
        Resource fileResource = documentService.downloadDocument(userDetails.getUser(), id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + details.getFileName() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, details.getFileType())
                .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(details.getFileSize()))
                .body(fileResource);
    }

    /**
     * Deletes a document asset from storage and database.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          document UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}")
    public ApiResponse<Void> deleteDocument(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        documentService.deleteDocument(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Document deleted successfully");
    }
}
