package com.lifeos.subscription.dto;

import com.lifeos.subscription.SubscriptionPlan;
import com.lifeos.subscription.SubscriptionStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Data Transfer Object capturing subscription create or upgrade details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubscriptionRequest {

    @NotNull(message = "Plan is required")
    private SubscriptionPlan plan;

    @NotNull(message = "Status is required")
    private SubscriptionStatus status;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.00", message = "Price cannot be negative")
    private BigDecimal price;

    @NotBlank(message = "Billing cycle is required")
    private String billingCycle;

    @NotNull(message = "Start date is required")
    private Instant startDate;

    private Instant endDate;
}
