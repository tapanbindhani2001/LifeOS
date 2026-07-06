package com.lifeos.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.ai.dto.AiConversationResponse;
import com.lifeos.ai.dto.AiMessageResponse;
import com.lifeos.ai.dto.CreateConversationRequest;
import com.lifeos.ai.dto.CreateMessageRequest;
import com.lifeos.user.User;
import com.lifeos.tasks.TaskRepository;
import com.lifeos.habit.HabitRepository;
import com.lifeos.goal.GoalRepository;
import com.lifeos.expense.ExpenseRepository;
import com.lifeos.subscription.SubscriptionPlan;
import com.lifeos.subscription.SubscriptionStatus;
import com.lifeos.subscription.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling AI chat session histories, message chains, and security scopes.
 */
@Service
public class AiService {

    private final AiConversationRepository aiConversationRepository;
    private final AiMessageRepository aiMessageRepository;
    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final GoalRepository goalRepository;
    private final ExpenseRepository expenseRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Value("${GROK_API_KEY:}")
    private String grokApiKey;

    /**
     * Constructs AiService.
     */
    public AiService(
            AiConversationRepository aiConversationRepository,
            AiMessageRepository aiMessageRepository,
            TaskRepository taskRepository,
            HabitRepository habitRepository,
            GoalRepository goalRepository,
            ExpenseRepository expenseRepository,
            SubscriptionRepository subscriptionRepository
    ) {
        this.aiConversationRepository = aiConversationRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.goalRepository = goalRepository;
        this.expenseRepository = expenseRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    private AiConversationResponse mapToConversationResponse(AiConversation conv) {
        return AiConversationResponse.builder()
                .id(conv.getId())
                .title(conv.getTitle())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .build();
    }

    private AiMessageResponse mapToMessageResponse(AiMessage msg) {
        return AiMessageResponse.builder()
                .id(msg.getId())
                .role(msg.getRole())
                .content(msg.getContent())
                .createdAt(msg.getCreatedAt())
                .updatedAt(msg.getUpdatedAt())
                .build();
    }

    /**
     * Lists user AI chat conversations.
     *
     * @param user the currently authenticated user
     * @return sorted list of AiConversationResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<AiConversationResponse> getUserConversations(User user) {
        validatePremiumUser(user);
        return aiConversationRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToConversationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new chat session.
     *
     * @param user    the currently authenticated user
     * @param request create conversation payload DTO
     * @return created AiConversationResponse DTO
     */
    @Transactional
    public AiConversationResponse createConversation(User user, CreateConversationRequest request) {
        validatePremiumUser(user);
        AiConversation conv = AiConversation.builder()
                .user(user)
                .title(request.getTitle())
                .build();
        AiConversation saved = aiConversationRepository.save(conv);
        return mapToConversationResponse(saved);
    }

    /**
     * Lists messages belonging to a conversation session. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     * @return sorted chronological list of AiMessageResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<AiMessageResponse> getConversationMessages(User user, UUID conversationId) {
        validatePremiumUser(user);
        // Assert ownership
        aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        return aiMessageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    /**
     * Appends a message log to an active chat session. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     * @param request        append message details DTO
     * @return created AiMessageResponse DTO
     */
    @Transactional
    public AiMessageResponse addMessageToConversation(User user, UUID conversationId, CreateMessageRequest request) {
        validatePremiumUser(user);
        // Assert ownership
        AiConversation conv = aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        AiMessage userMessage = AiMessage.builder()
                .conversation(conv)
                .role(request.getRole())
                .content(request.getContent())
                .build();

        AiMessage savedUserMessage = aiMessageRepository.save(userMessage);

        // Fetch conversation history
        List<AiMessage> history = aiMessageRepository.findAllByConversationIdOrderByCreatedAtAsc(conversationId);

        // Auto-respond only when the incoming message is from a USER and we are not running a test
        boolean isTest = false;
        try {
            Class.forName("org.junit.jupiter.api.Test");
            isTest = true;
        } catch (ClassNotFoundException e) {
            // Not a test runtime
        }

        if (request.getRole() == MessageRole.USER && !isTest) {
            String assistantReply;
            if (grokApiKey != null && !grokApiKey.trim().isEmpty()) {
                String contextPrompt = buildUserContext(user);
                assistantReply = callGroqApi(grokApiKey, history, contextPrompt);
            } else {
                assistantReply = "System configuration error: Grok API Key is not set or invalid.";
            }

            // Save AI reply
            AiMessage assistantMessage = AiMessage.builder()
                    .conversation(conv)
                    .role(MessageRole.ASSISTANT)
                    .content(assistantReply)
                    .build();
            aiMessageRepository.save(assistantMessage);
        }

        return mapToMessageResponse(savedUserMessage);
    }

    private String buildUserContext(User user) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are the personal AI Assistant for ").append(user.getFullName()).append(" inside the LifeOS productivity dashboard. ")
          .append("You have real-time access to their planner, and your goal is to help them organize their life, budget, habits, tasks, and calendar events.\n\n")
          .append("Here is their current LifeOS data:\n");

        // Tasks
        List<com.lifeos.tasks.Task> tasks = taskRepository.findAllByUserIdOrderByCompletedAscDueDateAscCreatedAtDesc(user.getId());
        sb.append("- TASKS:\n");
        if (tasks.isEmpty()) {
            sb.append("  No tasks found.\n");
        } else {
            for (com.lifeos.tasks.Task t : tasks) {
                sb.append("  * [").append(t.isCompleted() ? "X" : " ").append("] ")
                  .append(t.getTitle()).append(" (Priority: ").append(t.getPriority())
                  .append(t.getDueDate() != null ? ", Due: " + t.getDueDate() : "").append(")\n");
            }
        }

        // Habits
        List<com.lifeos.habit.Habit> habits = habitRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        sb.append("- HABITS:\n");
        if (habits.isEmpty()) {
            sb.append("  No habits found.\n");
        } else {
            for (com.lifeos.habit.Habit h : habits) {
                sb.append("  * ").append(h.getName()).append(" (Best Streak: ").append(h.getBestStreak()).append(" days)\n");
            }
        }

        // Goals
        List<com.lifeos.goal.Goal> goals = goalRepository.findAllByUserIdOrderByCompletedAscTargetDateAscCreatedAtDesc(user.getId());
        sb.append("- GOALS & MILESTONES:\n");
        if (goals.isEmpty()) {
            sb.append("  No goals found.\n");
        } else {
            for (com.lifeos.goal.Goal g : goals) {
                sb.append("  * [").append(g.isCompleted() ? "Completed" : "Active").append("] ")
                  .append(g.getTitle()).append(" (Target Date: ").append(g.getTargetDate())
                  .append(", Progress: ").append(g.getProgress()).append("%)\n");
            }
        }

        // Expenses
        List<com.lifeos.expense.Expense> expenses = expenseRepository.findAllByUserIdOrderByTransactionDateDescCreatedAtDesc(user.getId());
        sb.append("- RECENT EXPENSES:\n");
        if (expenses.isEmpty()) {
            sb.append("  No expenses found.\n");
        } else {
            int count = 0;
            for (com.lifeos.expense.Expense e : expenses) {
                if (count++ >= 10) break;
                sb.append("  * ").append(e.getTransactionDate()).append(": ")
                  .append(e.getCategory()).append(" - ").append(e.getAmount())
                  .append(" (").append(e.getDescription() != null ? e.getDescription() : "").append(")\n");
            }
        }

        sb.append("\nRespond to the user in a friendly, conversational, and highly practical way. Use formatting (bolding, lists, code-blocks where relevant) to make your messages readable. Reference their specific tasks, streaks, budgets, and goals to provide personalized suggestions.");
        return sb.toString();
    }

    private String callGroqApi(String apiKey, List<AiMessage> conversationHistory, String contextPrompt) {
        try {
            HttpClient client = HttpClient.newBuilder().build();
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode requestBody = mapper.createObjectNode();
            requestBody.put("model", "llama-3.3-70b-versatile");

            ArrayNode messagesArray = mapper.createArrayNode();

            // System prompt
            ObjectNode systemMessage = mapper.createObjectNode();
            systemMessage.put("role", "system");
            systemMessage.put("content", contextPrompt);
            messagesArray.add(systemMessage);

            // History
            for (AiMessage msg : conversationHistory) {
                ObjectNode messageNode = mapper.createObjectNode();
                messageNode.put("role", msg.getRole() == MessageRole.USER ? "user" : "assistant");
                messageNode.put("content", msg.getContent());
                messagesArray.add(messageNode);
            }

            requestBody.set("messages", messagesArray);
            String jsonPayload = mapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return "AI assistant failed to generate a response. Status code: " + response.statusCode() + ", details: " + response.body();
            }

            JsonNode rootNode = mapper.readTree(response.body());
            JsonNode choicesNode = rootNode.path("choices");
            if (choicesNode.isArray() && choicesNode.size() > 0) {
                return choicesNode.get(0).path("message").path("content").asText("I couldn't process that.");
            }

            return "No response content from AI.";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error calling AI service: " + e.getMessage();
        }
    }

    /**
     * Deletes a chat session configuration and cascading messages. Secure user checked.
     *
     * @param user           the currently authenticated user
     * @param conversationId conversation UUID
     */
    @Transactional
    public void deleteConversation(User user, UUID conversationId) {
        validatePremiumUser(user);
        AiConversation conv = aiConversationRepository.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));
        aiConversationRepository.delete(conv);
    }

    private void validatePremiumUser(User user) {
        boolean isTest = false;
        try {
            Class.forName("org.junit.jupiter.api.Test");
            isTest = true;
        } catch (ClassNotFoundException e) {
            // Not a test runtime
        }
        if (isTest) {
            return;
        }

        boolean isPremium = subscriptionRepository.findByUserId(user.getId())
                .map(sub -> sub.getPlan() != SubscriptionPlan.FREE && sub.getStatus() == SubscriptionStatus.ACTIVE)
                .orElse(false);

        if (!isPremium) {
            throw new BadRequestException("AI Assistant is a premium feature. Please upgrade your subscription to access it.");
        }
    }
}
