package com.lifeos.subscription;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.subscription.dto.CreateSubscriptionRequest;
import com.lifeos.subscription.dto.SubscriptionResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller exposing secure endpoints to create, upgrade, cancel, and inspect user subscriptions.
 */
@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    /**
     * Constructs SubscriptionController.
     *
     * @param subscriptionService service handling subscription business rules
     */
    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    /**
     * Retrieves the subscription details for the authenticated user (defaults to virtual FREE plan if none exists).
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing SubscriptionResponse DTO
     */
    @GetMapping("/me")
    public ApiResponse<SubscriptionResponse> getSubscription(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        SubscriptionResponse response = subscriptionService.getSubscription(userDetails.getUser());
        return ApiResponse.success(response, "Fetched active subscription successfully");
    }

    /**
     * Upgrades or creates a subscription plan.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create or upgrade payload DTO
     * @return standard ApiResponse containing updated SubscriptionResponse DTO
     */
    @PostMapping
    public ApiResponse<SubscriptionResponse> createOrUpgradeSubscription(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateSubscriptionRequest request
    ) {
        SubscriptionResponse response = subscriptionService.createOrUpgradeSubscription(userDetails.getUser(), request);
        return ApiResponse.success(response, "Subscription updated successfully");
    }

    /**
     * Cancels subscription auto-renewal at the end of the current billing cycle.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing updated SubscriptionResponse DTO
     */
    @PostMapping("/cancel")
    public ApiResponse<SubscriptionResponse> cancelSubscription(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        SubscriptionResponse response = subscriptionService.cancelSubscription(userDetails.getUser());
        return ApiResponse.success(response, "Subscription renewal cancelled successfully");
    }
}
