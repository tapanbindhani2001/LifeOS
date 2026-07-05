package com.lifeos.admin;

import com.lifeos.admin.dto.AdminStatsResponse;
import com.lifeos.admin.dto.AdminUserResponse;
import com.lifeos.ai.AiConversationRepository;
import com.lifeos.calendar.CalendarEventRepository;
import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.document.DocumentRepository;
import com.lifeos.expense.ExpenseRepository;
import com.lifeos.habit.HabitRepository;
import com.lifeos.notes.NoteRepository;
import com.lifeos.notification.NotificationRepository;
import com.lifeos.subscription.SubscriptionRepository;
import com.lifeos.tasks.TaskRepository;
import com.lifeos.user.Role;
import com.lifeos.user.User;
import com.lifeos.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling system statistics and user account administrations.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final TaskRepository taskRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final ExpenseRepository expenseRepository;
    private final HabitRepository habitRepository;
    private final DocumentRepository documentRepository;
    private final NotificationRepository notificationRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final AiConversationRepository aiConversationRepository;

    /**
     * Constructs AdminService with all platform repositories to compile aggregate statistics.
     */
    public AdminService(
            UserRepository userRepository,
            NoteRepository noteRepository,
            TaskRepository taskRepository,
            CalendarEventRepository calendarEventRepository,
            ExpenseRepository expenseRepository,
            HabitRepository habitRepository,
            DocumentRepository documentRepository,
            NotificationRepository notificationRepository,
            SubscriptionRepository subscriptionRepository,
            AiConversationRepository aiConversationRepository
    ) {
        this.userRepository = userRepository;
        this.noteRepository = noteRepository;
        this.taskRepository = taskRepository;
        this.calendarEventRepository = calendarEventRepository;
        this.expenseRepository = expenseRepository;
        this.habitRepository = habitRepository;
        this.documentRepository = documentRepository;
        this.notificationRepository = notificationRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.aiConversationRepository = aiConversationRepository;
    }

    private AdminUserResponse mapToUserResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }

    /**
     * Compiles system usage stats across all modules.
     *
     * @return AdminStatsResponse DTO containing active database counts
     */
    @Transactional(readOnly = true)
    public AdminStatsResponse getSystemStats() {
        return AdminStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalNotes(noteRepository.count())
                .totalTasks(taskRepository.count())
                .totalCalendarEvents(calendarEventRepository.count())
                .totalExpenses(expenseRepository.count())
                .totalHabits(habitRepository.count())
                .totalDocuments(documentRepository.count())
                .totalNotifications(notificationRepository.count())
                .totalSubscriptions(subscriptionRepository.count())
                .totalAiConversations(aiConversationRepository.count())
                .build();
    }

    /**
     * Lists all registered user accounts.
     *
     * @return list of AdminUserResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Enables or disables a user account. Prevents demoting or locking out oneself.
     *
     * @param admin  the currently authenticated administrator user
     * @param userId target user account UUID to toggle status
     * @return updated AdminUserResponse DTO
     */
    @Transactional
    public AdminUserResponse toggleUserStatus(User admin, UUID userId) {
        if (admin.getId().equals(userId)) {
            throw new BadRequestException("Self-lockout prevention: cannot disable your own administrator account");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setEnabled(!user.isEnabled());
        User saved = userRepository.save(user);
        return mapToUserResponse(saved);
    }

    /**
     * Modifies a user's role. Prevents changing one's own role.
     *
     * @param admin   the currently authenticated administrator user
     * @param userId  target user account UUID to alter
     * @param newRole target role configuration to apply
     * @return updated AdminUserResponse DTO
     */
    @Transactional
    public AdminUserResponse updateUserRole(User admin, UUID userId, Role newRole) {
        if (admin.getId().equals(userId)) {
            throw new BadRequestException("Self-lockout prevention: cannot modify your own administrator role");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setRole(newRole);
        User saved = userRepository.save(user);
        return mapToUserResponse(saved);
    }
}
