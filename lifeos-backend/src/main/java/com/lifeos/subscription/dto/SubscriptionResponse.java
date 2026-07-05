package com.lifeos.subscription.dto;

import com.lifeos.subscription.SubscriptionPlan;
import com.lifeos.subscription.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Data Transfer Object presenting user subscription details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionResponse {
    private UUID id;
    private SubscriptionPlan plan;
    private SubscriptionStatus status;
    private BigDecimal price;
    private String billingCycle;
    private Instant startDate;
    private Instant endDate;
    private boolean cancelAtPeriodEnd;
    private Instant createdAt;
    private Instant updatedAt;
}
