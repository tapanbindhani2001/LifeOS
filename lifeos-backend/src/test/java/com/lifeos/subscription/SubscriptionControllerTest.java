package com.lifeos.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.subscription.dto.CreateSubscriptionRequest;
import com.lifeos.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying SubscriptionController virtual free plan defaults,
 * upgrades, O(1) overwrite updates, renewal cancellations, and status validations.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SubscriptionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String userToken;

    @BeforeEach
    void setUp() throws Exception {
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        // Create user and obtain token
        RegisterRequest register = RegisterRequest.builder()
                .email("subscriber@lifeos.com")
                .password("password123")
                .fullName("Paid Subscriber")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andReturn();
        String content = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(content, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        userToken = (String) dataMap.get("token");
    }

    @Test
    void whenNewUser_thenReturnVirtualFreePlan() throws Exception {
        mockMvc.perform(get("/api/v1/subscriptions/me")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", nullValue()))
                .andExpect(jsonPath("$.data.plan", is("FREE")))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.price", is(0)))
                .andExpect(jsonPath("$.data.billingCycle", is("free")))
                .andExpect(jsonPath("$.data.cancelAtPeriodEnd", is(false)));
    }

    @Test
    void whenUpgradePlan_thenSaveDetails() throws Exception {
        CreateSubscriptionRequest request = CreateSubscriptionRequest.builder()
                .plan(SubscriptionPlan.MONTHLY)
                .status(SubscriptionStatus.ACTIVE)
                .price(new BigDecimal("9.99"))
                .billingCycle("monthly")
                .startDate(Instant.now())
                .endDate(Instant.now().plusSeconds(86400 * 30))
                .build();

        mockMvc.perform(post("/api/v1/subscriptions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.plan", is("MONTHLY")))
                .andExpect(jsonPath("$.data.price", is(9.99)))
                .andExpect(jsonPath("$.data.status", is("ACTIVE")))
                .andExpect(jsonPath("$.data.cancelAtPeriodEnd", is(false)));
    }

    @Test
    void whenUpgradeMultipleTimes_thenOverwriteRow() throws Exception {
        CreateSubscriptionRequest sub1 = CreateSubscriptionRequest.builder()
                .plan(SubscriptionPlan.MONTHLY)
                .status(SubscriptionStatus.ACTIVE)
                .price(new BigDecimal("9.99"))
                .billingCycle("monthly")
                .startDate(Instant.now())
                .build();

        // Upgrade 1
        mockMvc.perform(post("/api/v1/subscriptions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub1)))
                .andExpect(status().isOk());

        // Upgrade 2 (should update the existing row)
        CreateSubscriptionRequest sub2 = CreateSubscriptionRequest.builder()
                .plan(SubscriptionPlan.ANNUAL)
                .status(SubscriptionStatus.ACTIVE)
                .price(new BigDecimal("99.99"))
                .billingCycle("yearly")
                .startDate(Instant.now())
                .build();

        mockMvc.perform(post("/api/v1/subscriptions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan", is("ANNUAL")))
                .andExpect(jsonPath("$.data.price", is(99.99)));
    }

    @Test
    void whenCancelSubscription_thenRenewalToggles() throws Exception {
        // First upgrade to paid plan
        CreateSubscriptionRequest paid = CreateSubscriptionRequest.builder()
                .plan(SubscriptionPlan.MONTHLY)
                .status(SubscriptionStatus.ACTIVE)
                .price(new BigDecimal("9.99"))
                .billingCycle("monthly")
                .startDate(Instant.now())
                .build();

        mockMvc.perform(post("/api/v1/subscriptions")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paid)))
                .andExpect(status().isOk());

        // Cancel
        mockMvc.perform(post("/api/v1/subscriptions/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cancelAtPeriodEnd", is(true)))
                .andExpect(jsonPath("$.data.status", is("CANCELLED")));
    }

    @Test
    void whenCancelFreePlan_thenReturn400() throws Exception {
        mockMvc.perform(post("/api/v1/subscriptions/cancel")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("No active paid subscription found to cancel")));
    }
}
