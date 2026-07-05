package com.lifeos.document;

import com.lifeos.common.entity.BaseAuditEntity;
import com.lifeos.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * JPA Entity representing user documents and attachments in the LifeOS application.
 */
@Entity
@Table(name = "documents", indexes = {
        @Index(name = "idx_documents_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_type", nullable = false, length = 100)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Builder.Default
    @Column(name = "scanned", nullable = false)
    private boolean scanned = false;
}
