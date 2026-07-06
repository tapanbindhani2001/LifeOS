package com.lifeos.budget.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object representing a budget with real-time spending enrichment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetResponse {

    private UUID id;
    private String category;
    private BigDecimal monthlyLimit;

    /** Actual amount spent in this category for the current calendar month. */
    private BigDecimal spent;

    /** Percentage of budget used (0–100+). Capped display handled on the frontend. */
    private double percentage;

    /** ON_TRACK | WARNING | OVER_BUDGET */
    private String status;

    private Instant createdAt;
    private Instant updatedAt;
}
