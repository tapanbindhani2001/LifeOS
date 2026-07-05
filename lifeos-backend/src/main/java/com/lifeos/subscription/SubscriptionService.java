package com.lifeos.subscription;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.subscription.dto.CreateSubscriptionRequest;
import com.lifeos.subscription.dto.SubscriptionResponse;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Service class managing user subscriptions upgrades, cancellations, and virtual defaults.
 */
@Service
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    /**
     * Constructs SubscriptionService.
     *
     * @param subscriptionRepository repository handling database subscriptions queries
     */
    public SubscriptionService(SubscriptionRepository subscriptionRepository) {
        this.subscriptionRepository = subscriptionRepository;
    }

    private SubscriptionResponse mapToResponse(Subscription sub) {
        return SubscriptionResponse.builder()
                .id(sub.getId())
                .plan(sub.getPlan())
                .status(sub.getStatus())
                .price(sub.getPrice())
                .billingCycle(sub.getBillingCycle())
                .startDate(sub.getStartDate())
                .endDate(sub.getEndDate())
                .cancelAtPeriodEnd(sub.isCancelAtPeriodEnd())
                .createdAt(sub.getCreatedAt())
                .updatedAt(sub.getUpdatedAt())
                .build();
    }

    private SubscriptionResponse getVirtualFreeResponse(User user) {
        return SubscriptionResponse.builder()
                .id(null)
                .plan(SubscriptionPlan.FREE)
                .status(SubscriptionStatus.ACTIVE)
                .price(BigDecimal.ZERO)
                .billingCycle("free")
                .startDate(user.getCreatedAt())
                .endDate(null)
                .cancelAtPeriodEnd(false)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getCreatedAt())
                .build();
    }

    /**
     * Retrieves current subscription details. Defaults to virtual FREE plan if none configured in DB.
     *
     * @param user the currently authenticated user
     * @return current SubscriptionResponse DTO
     */
    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscription(User user) {
        return subscriptionRepository.findByUserId(user.getId())
                .map(this::mapToResponse)
                .orElseGet(() -> getVirtualFreeResponse(user));
    }

    /**
     * Creates new or updates existing subscription parameters. Securely user scoped.
     *
     * @param user    the currently authenticated user
     * @param request create/upgrade subscription details DTO
     * @return active SubscriptionResponse DTO
     */
    @Transactional
    public SubscriptionResponse createOrUpgradeSubscription(User user, CreateSubscriptionRequest request) {
        Optional<Subscription> existingSubOpt = subscriptionRepository.findByUserId(user.getId());
        Subscription sub;

        if (existingSubOpt.isPresent()) {
            sub = existingSubOpt.get();
            sub.setPlan(request.getPlan());
            sub.setStatus(request.getStatus());
            sub.setPrice(request.getPrice());
            sub.setBillingCycle(request.getBillingCycle());
            sub.setStartDate(request.getStartDate());
            sub.setEndDate(request.getEndDate());
            sub.setCancelAtPeriodEnd(false); // Reset cancel requests on upgrade
        } else {
            sub = Subscription.builder()
                    .user(user)
                    .plan(request.getPlan())
                    .status(request.getStatus())
                    .price(request.getPrice())
                    .billingCycle(request.getBillingCycle())
                    .startDate(request.getStartDate())
                    .endDate(request.getEndDate())
                    .cancelAtPeriodEnd(false)
                    .build();
        }

        Subscription savedSub = subscriptionRepository.save(sub);
        return mapToResponse(savedSub);
    }

    /**
     * Cancels subscription renewal at the end of the active billing period. Securely user scoped.
     *
     * @param user the currently authenticated user
     * @return updated SubscriptionResponse DTO
     */
    @Transactional
    public SubscriptionResponse cancelSubscription(User user) {
        Subscription sub = subscriptionRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BadRequestException("No active paid subscription found to cancel"));

        if (sub.getPlan() == SubscriptionPlan.FREE) {
            throw new BadRequestException("Cannot cancel a free subscription plan");
        }

        sub.setCancelAtPeriodEnd(true);
        sub.setStatus(SubscriptionStatus.CANCELLED);
        Subscription savedSub = subscriptionRepository.save(sub);
        return mapToResponse(savedSub);
    }
}
