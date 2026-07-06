package com.lifeos.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object for creating or updating a category budget limit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpsertBudgetRequest {

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Monthly limit is required")
    @DecimalMin(value = "1.0", message = "Monthly limit must be at least 1")
    private BigDecimal monthlyLimit;
}
