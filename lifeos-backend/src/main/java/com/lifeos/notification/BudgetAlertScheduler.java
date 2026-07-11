package com.lifeos.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifeos.budget.Budget;
import com.lifeos.budget.BudgetRepository;
import com.lifeos.expense.Expense;
import com.lifeos.expense.ExpenseRepository;
import com.lifeos.user.User;
import com.lifeos.user.UserDevice;
import com.lifeos.user.UserDeviceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scheduled component that processes user budgets, detects thresholds, 
 * generates AI alerts using Groq, and dispatches push notifications.
 */
@Component
public class BudgetAlertScheduler {

    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationRepository notificationRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final ExpoPushService expoPushService;

    @Value("${GROK_API_KEY:}")
    private String grokApiKey;

    public BudgetAlertScheduler(
            BudgetRepository budgetRepository,
            ExpenseRepository expenseRepository,
            NotificationRepository notificationRepository,
            UserDeviceRepository userDeviceRepository,
            ExpoPushService expoPushService
    ) {
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.notificationRepository = notificationRepository;
        this.userDeviceRepository = userDeviceRepository;
        this.expoPushService = expoPushService;
    }

    /**
     * Scheduled task running every 2 hours to check user budgets.
     */
    @Scheduled(cron = "0 0 */2 * * *")
    @Transactional
    public void checkBudgetsAndNotify() {
        System.out.println("Executing BudgetAlertScheduler budget check job...");
        
        List<Budget> allBudgets = budgetRepository.findAll();
        if (allBudgets.isEmpty()) return;

        // Group budgets by User
        Map<User, List<Budget>> userBudgetsMap = allBudgets.stream()
                .collect(Collectors.groupingBy(Budget::getUser));

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        for (Map.Entry<User, List<Budget>> entry : userBudgetsMap.entrySet()) {
            User user = entry.getKey();
            List<Budget> userBudgets = entry.getValue();

            // Fetch user expenses for current month
            List<Expense> expenses = expenseRepository.findAllByUserIdAndDateRange(user.getId(), startOfMonth, endOfMonth);

            // Sum actual spending per category
            Map<String, BigDecimal> actualSpending = expenses.stream()
                    .filter(e -> e.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            Expense::getCategory,
                            Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                    ));

            for (Budget budget : userBudgets) {
                String category = budget.getCategory();
                BigDecimal limit = budget.getMonthlyLimit();
                if (limit == null || limit.compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal spent = actualSpending.getOrDefault(category, BigDecimal.ZERO);
                BigDecimal ratio = spent.divide(limit, 4, BigDecimal.ROUND_HALF_UP);

                // Threshold: >= 80% (0.80)
                if (ratio.compareTo(new BigDecimal("0.80")) >= 0) {
                    String alertTitle = "[BUDGET] " + category.toUpperCase();
                    Instant oneDayAgo = Instant.now().minus(24, ChronoUnit.HOURS);

                    // Check if already notified for this category in last 24h
                    boolean alreadyNotified = notificationRepository.existsByUserIdAndTitleAndCreatedAtAfter(
                            user.getId(), alertTitle, oneDayAgo
                    );

                    if (!alreadyNotified) {
                        String message = generateAiMessage(user, category, limit, spent);
                        
                        // Save notification in database
                        Notification notification = Notification.builder()
                                .user(user)
                                .title(alertTitle)
                                .message(message)
                                .type(NotificationType.BUDGET_ALERT)
                                .read(false)
                                .build();
                        notificationRepository.save(notification);

                        // Fetch devices & send push notification
                        List<UserDevice> devices = userDeviceRepository.findAllByUserId(user.getId());
                        for (UserDevice device : devices) {
                            expoPushService.sendPushNotification(
                                    device.getExpoPushToken(),
                                    category.substring(0, 1).toUpperCase() + category.substring(1).toLowerCase() + " Budget Alert",
                                    message
                            );
                        }
                    }
                }
            }
        }
    }

    private String generateAiMessage(User user, String category, BigDecimal limit, BigDecimal spent) {
        double percent = (spent.doubleValue() / limit.doubleValue()) * 100.0;
        
        // Return fallback message if API key not present
        if (grokApiKey == null || grokApiKey.trim().isEmpty()) {
            return String.format("Alert: You have spent ₹%.0f of your ₹%.0f monthly budget for %s (%.1f%% used).", 
                    spent, limit, category.toLowerCase(), percent);
        }

        try {
            HttpClient client = HttpClient.newBuilder().build();
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode requestBody = mapper.createObjectNode();
            requestBody.put("model", "llama-3.3-70b-versatile");
            requestBody.put("temperature", 0.7);

            ArrayNode messagesArray = mapper.createArrayNode();
            ObjectNode systemMessage = mapper.createObjectNode();
            systemMessage.put("role", "system");
            systemMessage.put("content", "You are the personal AI financial assistant for LifeOS. Generate a single, short (max 2 sentences), friendly, conversational budget alert warning the user about their spending. Do not include markdown headers, bullet points, or list formatting. Keep it encouraging.");
            messagesArray.add(systemMessage);

            ObjectNode userMessage = mapper.createObjectNode();
            userMessage.put("role", "user");
            userMessage.put("content", String.format("User: %s. Category: %s. Monthly Limit: ₹%.0f. Actual spent this month so far: ₹%.0f (%.1f%% limit reached). Provide a helpful warning.", 
                    user.getFullName(), category, limit, spent, percent));
            messagesArray.add(userMessage);

            requestBody.set("messages", messagesArray);
            String jsonPayload = mapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + grokApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode rootNode = mapper.readTree(response.body());
                JsonNode choicesNode = rootNode.path("choices");
                if (choicesNode.isArray() && choicesNode.size() > 0) {
                    return choicesNode.get(0).path("message").path("content").asText().trim();
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Encapsulating fallback message
        return String.format("You've spent %.1f%% of your %s budget: ₹%.0f spent out of ₹%.0f limit.", 
                percent, category.toLowerCase(), spent, limit);
    }
}
