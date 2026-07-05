package com.lifeos.calendar;

import com.lifeos.common.entity.BaseAuditEntity;
import com.lifeos.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity representing a calendar event in the LifeOS application.
 */
@Entity
@Table(name = "calendar_events", indexes = {
        @Index(name = "idx_calendar_events_user_id", columnList = "user_id"),
        @Index(name = "idx_calendar_events_user_start", columnList = "user_id, start_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEvent extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Column(name = "location")
    private String location;

    @Builder.Default
    @Column(name = "color", length = 50)
    private String color = "#3B82F6";
}
