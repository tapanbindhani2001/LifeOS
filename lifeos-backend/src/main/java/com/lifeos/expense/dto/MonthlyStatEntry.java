package com.lifeos.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing monthly financial aggregates for trend analytics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyStatEntry {
    /** Month label in format YYYY-MM (e.g., "2025-06"). */
    private String month;
    private BigDecimal income;
    private BigDecimal expense;
}
