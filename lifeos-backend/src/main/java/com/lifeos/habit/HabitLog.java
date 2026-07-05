package com.lifeos.habit;

import com.lifeos.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA Entity representing a logged check-in for a specific habit on a specific date.
 */
@Entity
@Table(name = "habit_logs", indexes = {
        @Index(name = "idx_habit_logs_habit_id", columnList = "habit_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_habit_logs_habit_date", columnNames = {"habit_id", "date"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HabitLog extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @Column(name = "date", nullable = false)
    private LocalDate date;
}
