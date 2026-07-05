package com.lifeos.expense.dto;

import com.lifeos.expense.ExpenseType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Data Transfer Object presenting financial transaction details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponse {
    private UUID id;
    private BigDecimal amount;
    private ExpenseType type;
    private String category;
    private String description;
    private LocalDate transactionDate;
    private Instant createdAt;
    private Instant updatedAt;
}
