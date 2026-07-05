package com.lifeos.expense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing category aggregated transaction sums.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategorySum {
    private String category;
    private BigDecimal amount;
}
