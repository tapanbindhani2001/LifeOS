package com.lifeos.document;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.document.dto.DocumentResponse;
import com.lifeos.document.dto.StorageSummaryResponse;
import com.lifeos.subscription.Subscription;
import com.lifeos.subscription.SubscriptionPlan;
import com.lifeos.subscription.SubscriptionRepository;
import com.lifeos.user.User;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling file storage upload, secure download streams, and metadata tracking.
 */
@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final Path rootLocation;

    /**
     * Constructs a DocumentService.
     *
     * @param documentRepository repository handling database documents metadata
     * @param subscriptionRepository repository handling subscriptions metadata
     * @param uploadDir          directory path configured for file uploads
     */
    public DocumentService(
            DocumentRepository documentRepository,
            SubscriptionRepository subscriptionRepository,
            @Value("${storage.upload-dir}") String uploadDir
    ) {
        this.documentRepository = documentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.rootLocation = Paths.get(uploadDir);
    }

    /**
     * Prepares upload directory folders if they do not exist.
     */
    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage folder: " + rootLocation, e);
        }
    }

    private DocumentResponse mapToResponse(Document doc) {
        return DocumentResponse.builder()
                .id(doc.getId())
                .fileName(doc.getFileName())
                .fileType(doc.getFileType())
                .fileSize(doc.getFileSize())
                .scanned(doc.isScanned())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    /**
     * Lists user documents ordered by creation date descending.
     *
     * @param user the currently authenticated user
     * @return sorted list of DocumentResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getUserDocuments(User user) {
        return documentRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves specific document details. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   document UUID
     * @return DocumentResponse DTO
     */
    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(User user, UUID id) {
        Document doc = documentRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
        return mapToResponse(doc);
    }

    /**
     * Saves uploaded MultipartFile to disk and tracks metadata in database.
     *
     * @param user    the currently authenticated user
     * @param file    uploaded multipart file asset
     * @param scanned scanned status flag
     * @return created DocumentResponse DTO
     */
    @Transactional
    public DocumentResponse uploadDocument(User user, MultipartFile file, boolean scanned) {
        if (file.isEmpty()) {
            throw new BadRequestException("Failed to store empty file");
        }

        // Validate storage limits before saving
        StorageSummaryResponse storage = getStorageSummary(user);
        if (storage.getUsedBytes() + file.getSize() > storage.getLimitBytes()) {
            throw new BadRequestException("Storage limit exceeded. To get more storage access, please upgrade to Premium!");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            originalFilename = "unnamed";
        }

        Document doc = Document.builder()
                .user(user)
                .fileName(originalFilename)
                .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .storagePath("") // Temp empty path, updated below
                .scanned(scanned)
                .build();

        doc = documentRepository.save(doc);

        Path destinationFile = this.rootLocation.resolve(doc.getId().toString()).normalize();

        try {
            Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write file stream to disk: " + doc.getId(), e);
        }

        doc.setStoragePath(destinationFile.toAbsolutePath().toString());
        Document savedDoc = documentRepository.save(doc);
        return mapToResponse(savedDoc);
    }

    /**
     * Calculates the user's storage consumption and matches it against their subscription limit.
     *
     * @param user current User
     * @return StorageSummaryResponse containing current used bytes and total allowed bytes
     */
    @Transactional(readOnly = true)
    public StorageSummaryResponse getStorageSummary(User user) {
        long usedBytes = documentRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .mapToLong(Document::getFileSize)
                .sum();

        SubscriptionPlan plan = subscriptionRepository.findByUserId(user.getId())
                .map(Subscription::getPlan)
                .orElse(SubscriptionPlan.FREE);

        boolean isPremium = plan == SubscriptionPlan.MONTHLY || plan == SubscriptionPlan.ANNUAL;
        
        // 1 GB for Free, 10 GB for Premium
        long limitBytes = isPremium ? 10L * 1024 * 1024 * 1024 : 1L * 1024 * 1024 * 1024;

        return StorageSummaryResponse.builder()
                .usedBytes(usedBytes)
                .limitBytes(limitBytes)
                .planName(plan.name())
                .isPremium(isPremium)
                .build();
    }

    /**
     * Loads a file resource securely for download. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   document UUID
     * @return dynamic Resource stream
     */
    @Transactional(readOnly = true)
    public Resource downloadDocument(User user, UUID id) {
        Document doc = documentRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        Path file = Paths.get(doc.getStoragePath());
        try {
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Could not read file: " + doc.getFileName());
            }
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("Could not read file: " + doc.getFileName(), e);
        }
    }

    /**
     * Deletes a document from the filesystem and removes database metadata. Secure user checked.
     *
     * @param user the currently authenticated user
     * @param id   document UUID
     */
    @Transactional
    public void deleteDocument(User user, UUID id) {
        Document doc = documentRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

        Path file = Paths.get(doc.getStoragePath());
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file from disk: " + doc.getStoragePath(), e);
        }

        documentRepository.delete(doc);
    }
}
