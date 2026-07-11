package com.lifeos.user;

import com.lifeos.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * JPA Entity representing the User Device registration for push notifications.
 */
@Entity
@Table(name = "user_devices", uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_devices_token", columnNames = {"expo_push_token"})
}, indexes = {
        @Index(name = "idx_user_devices_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevice extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User user;

    @Column(name = "expo_push_token", nullable = false, length = 255)
    private String expoPushToken;

    @Column(name = "platform", length = 50)
    private String platform;
}
