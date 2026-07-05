package com.lifeos.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object presenting system-wide usage statistics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsResponse {
    private long totalUsers;
    private long totalNotes;
    private long totalTasks;
    private long totalCalendarEvents;
    private long totalExpenses;
    private long totalHabits;
    private long totalDocuments;
    private long totalNotifications;
    private long totalSubscriptions;
    private long totalAiConversations;
}
