package com.lifeos.expense;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.expense.dto.*;
import com.lifeos.user.User;
import com.lifeos.user.UserDevice;
import com.lifeos.user.UserDeviceRepository;
import com.lifeos.budget.Budget;
import com.lifeos.budget.BudgetRepository;
import com.lifeos.notification.Notification;
import com.lifeos.notification.NotificationRepository;
import com.lifeos.notification.NotificationType;
import com.lifeos.notification.ExpoPushService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class handling expense list operations and financial aggregates.
 */
@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationRepository notificationRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final ExpoPushService expoPushService;

    /** Lock period: transactions older than 60 days cannot be modified or deleted. */
    private static final int LOCK_DAYS = 60;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            BudgetRepository budgetRepository,
            NotificationRepository notificationRepository,
            UserDeviceRepository userDeviceRepository,
            ExpoPushService expoPushService
    ) {
        this.expenseRepository = expenseRepository;
        this.budgetRepository = budgetRepository;
        this.notificationRepository = notificationRepository;
        this.userDeviceRepository = userDeviceRepository;
        this.expoPushService = expoPushService;
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .type(expense.getType())
                .category(expense.getCategory())
                .description(expense.getDescription())
                .transactionDate(expense.getTransactionDate())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getUserExpenses(User user) {
        return expenseRepository.findAllByUserIdOrderByTransactionDateDescCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(User user, UUID id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        return mapToResponse(expense);
    }

    @Transactional(readOnly = true)
    public ExpenseSummaryResponse getExpenseSummary(User user, LocalDate start, LocalDate end) {
        if (end.isBefore(start)) {
            throw new BadRequestException("Start date must be before or equal to end date");
        }

        BigDecimal totalIncome = expenseRepository.sumAmountByTypeAndDateRange(user.getId(), ExpenseType.INCOME, start, end);
        BigDecimal totalExpense = expenseRepository.sumAmountByTypeAndDateRange(user.getId(), ExpenseType.EXPENSE, start, end);
        BigDecimal netBalance = totalIncome.subtract(totalExpense);
        List<CategorySum> categoryBreakdown = expenseRepository.sumByCategoryAndDateRange(user.getId(), ExpenseType.EXPENSE, start, end);

        return ExpenseSummaryResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .netBalance(netBalance)
                .categoryBreakdown(categoryBreakdown)
                .build();
    }

    @Transactional(readOnly = true)
    public List<MonthlyStatEntry> getMonthlySummary(User user, int months) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(months - 1L).withDayOfMonth(1);

        List<Expense> expenses = expenseRepository.findAllByUserIdAndDateRange(user.getId(), startDate, endDate);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        Map<String, BigDecimal[]> monthMap = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--) {
            String key = endDate.minusMonths(i).format(fmt);
            monthMap.put(key, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }

        for (Expense e : expenses) {
            String key = e.getTransactionDate().format(fmt);
            if (!monthMap.containsKey(key)) continue;
            BigDecimal[] arr = monthMap.get(key);
            if (e.getType() == ExpenseType.INCOME) {
                arr[0] = arr[0].add(e.getAmount());
            } else {
                arr[1] = arr[1].add(e.getAmount());
            }
        }

        return monthMap.entrySet().stream()
                .map(entry -> MonthlyStatEntry.builder()
                        .month(entry.getKey())
                        .income(entry.getValue()[0])
                        .expense(entry.getValue()[1])
                        .build())
                .collect(Collectors.toList());
    }

    private void validateTransactionDateNotLocked(LocalDate transactionDate) {
        if (transactionDate == null) return;
        LocalDate lockCutoff = LocalDate.now().minusDays(LOCK_DAYS);
        if (transactionDate.isBefore(lockCutoff)) {
            throw new BadRequestException(
                    "Transactions older than " + LOCK_DAYS + " days are locked and cannot be modified."
            );
        }
    }

    @Transactional
    public ExpenseResponse createExpense(User user, CreateExpenseRequest request) {
        // ── Idempotent SMS dedup ──────────────────────────────────────────────
        // If an Android SMS ID is provided, check if we already imported this message.
        // If so, return the existing record silently instead of creating a duplicate.
        if (request.getSmsExternalId() != null && !request.getSmsExternalId().isBlank()) {
            Optional<Expense> existing = expenseRepository
                    .findByUserIdAndSmsExternalId(user.getId(), request.getSmsExternalId());
            if (existing.isPresent()) {
                return mapToResponse(existing.get()); // idempotent: return existing, no duplicate
            }
        }

        // Skip 60-day lock for SMS auto-imports — users should be able to backfill full history
        if (request.getSmsExternalId() == null || request.getSmsExternalId().isBlank()) {
            validateTransactionDateNotLocked(request.getTransactionDate());
        }

        Expense expense = Expense.builder()
                .user(user)
                .amount(request.getAmount())
                .type(request.getType())
                .category(request.getCategory())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .smsExternalId(request.getSmsExternalId())
                .build();
        Expense saved = expenseRepository.save(expense);
        
        String alertMsg = null;
        if (request.getType() == ExpenseType.EXPENSE) {
            alertMsg = checkBudgetThresholdAndNotify(user, request.getCategory());
        }

        ExpenseResponse response = mapToResponse(saved);
        response.setBudgetAlert(alertMsg);
        return response;
    }


    @Transactional
    public ExpenseResponse updateExpense(User user, UUID id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));

        validateTransactionDateNotLocked(expense.getTransactionDate());
        validateTransactionDateNotLocked(request.getTransactionDate());

        expense.setAmount(request.getAmount());
        expense.setType(request.getType());
        expense.setCategory(request.getCategory());
        expense.setDescription(request.getDescription());
        expense.setTransactionDate(request.getTransactionDate());

        Expense saved = expenseRepository.save(expense);

        String alertMsg = null;
        if (request.getType() == ExpenseType.EXPENSE) {
            alertMsg = checkBudgetThresholdAndNotify(user, request.getCategory());
        }

        ExpenseResponse response = mapToResponse(saved);
        response.setBudgetAlert(alertMsg);
        return response;
    }

    @Transactional
    public void deleteExpense(User user, UUID id) {
        Expense expense = expenseRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        validateTransactionDateNotLocked(expense.getTransactionDate());
        expenseRepository.delete(expense);
    }

    private String checkBudgetThresholdAndNotify(User user, String category) {
        if (category == null) return null;
        
        Optional<Budget> budgetOpt = budgetRepository.findByUserIdAndCategory(user.getId(), category);
        if (budgetOpt.isEmpty()) return null;
        
        Budget budget = budgetOpt.get();
        BigDecimal limit = budget.getMonthlyLimit();
        if (limit == null || limit.compareTo(BigDecimal.ZERO) <= 0) return null;

        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        LocalDate endOfMonth = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        List<Expense> expenses = expenseRepository.findAllByUserIdAndDateRange(user.getId(), startOfMonth, endOfMonth);
        BigDecimal spent = expenses.stream()
                .filter(e -> category.equals(e.getCategory()) && e.getType() == ExpenseType.EXPENSE)
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal ratio = spent.divide(limit, 4, BigDecimal.ROUND_HALF_UP);

        // Threshold: >= 80% (0.80)
        if (ratio.compareTo(new BigDecimal("0.80")) >= 0) {
            String alertTitle = "[BUDGET] " + category.toUpperCase();
            java.time.Instant oneDayAgo = java.time.Instant.now().minus(24, java.time.temporal.ChronoUnit.HOURS);

            // Deduplicate: check if notified in last 24h (Bypassed temporarily for instant testing)
            boolean alreadyNotified = false;

            if (!alreadyNotified) {
                double percent = (spent.doubleValue() / limit.doubleValue()) * 100.0;
                String message;
                if (percent >= 100.0) {
                    message = String.format("🔴 Budget limit breached! You have spent ₹%.0f of your ₹%.0f monthly budget for %s (%.1f%% used).",
                            spent, limit, category.toLowerCase(), percent);
                } else {
                    message = String.format("⚠️ Almost reached budget! You have spent ₹%.0f of your ₹%.0f monthly budget for %s (%.1f%% used).",
                            spent, limit, category.toLowerCase(), percent);
                }

                // Save notification in database
                Notification notification = Notification.builder()
                        .user(user)
                        .title(alertTitle)
                        .message(message)
                        .type(NotificationType.BUDGET_ALERT)
                        .read(false)
                        .build();
                notificationRepository.save(notification);

                // Dispatch push notifications asynchronously
                List<UserDevice> devices = userDeviceRepository.findAllByUserId(user.getId());
                for (UserDevice device : devices) {
                    expoPushService.sendPushNotification(
                            device.getExpoPushToken(),
                            category.substring(0, 1).toUpperCase() + category.substring(1).toLowerCase() + " Budget Alert",
                            message
                    );
                }
                return message;
            }
        }
        return null;
    }
}
