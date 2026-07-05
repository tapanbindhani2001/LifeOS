package com.lifeos.goal;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.goal.dto.CreateGoalRequest;
import com.lifeos.goal.dto.GoalResponse;
import com.lifeos.goal.dto.UpdateGoalRequest;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling user goal creation, configurations, progress updates, and deletions.
 */
@Service
public class GoalService {

    private final GoalRepository goalRepository;

    /**
     * Constructs GoalService.
     *
     * @param goalRepository repository handling database goals queries
     */
    public GoalService(GoalRepository goalRepository) {
        this.goalRepository = goalRepository;
    }

    private GoalResponse mapToResponse(Goal goal) {
        return GoalResponse.builder()
                .id(goal.getId())
                .title(goal.getTitle())
                .description(goal.getDescription())
                .targetDate(goal.getTargetDate())
                .progress(goal.getProgress())
                .completed(goal.isCompleted())
                .createdAt(goal.getCreatedAt())
                .updatedAt(goal.getUpdatedAt())
                .build();
    }

    /**
     * Lists user goals (uncompleted first, sorted by target date and creation time).
     *
     * @param user the currently authenticated user
     * @return sorted list of GoalResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<GoalResponse> getUserGoals(User user) {
        return goalRepository.findAllByUserIdOrderByCompletedAscTargetDateAscCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves specific goal details. Secure user checked.
     *
     * @param user   the currently authenticated user
     * @param goalId goal UUID
     * @return GoalResponse DTO
     */
    @Transactional(readOnly = true)
    public GoalResponse getGoalById(User user, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));
        return mapToResponse(goal);
    }

    /**
     * Creates a new goal. Syncs completed status based on progress score.
     *
     * @param user    the currently authenticated user
     * @param request create goal payload DTO
     * @return created GoalResponse DTO
     */
    @Transactional
    public GoalResponse createGoal(User user, CreateGoalRequest request) {
        Goal goal = Goal.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .targetDate(request.getTargetDate())
                .progress(request.getProgress())
                .completed(request.getProgress() == 100)
                .build();

        Goal savedGoal = goalRepository.save(goal);
        return mapToResponse(savedGoal);
    }

    /**
     * Updates an existing goal. Syncs completed status based on progress score. Secure user checked.
     *
     * @param user    the currently authenticated user
     * @param goalId  goal UUID
     * @param request update goal payload DTO
     * @return updated GoalResponse DTO
     */
    @Transactional
    public GoalResponse updateGoal(User user, UUID goalId, UpdateGoalRequest request) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));

        goal.setTitle(request.getTitle());
        goal.setDescription(request.getDescription());
        goal.setTargetDate(request.getTargetDate());
        goal.setProgress(request.getProgress());
        goal.setCompleted(request.getProgress() == 100);

        Goal savedGoal = goalRepository.save(goal);
        return mapToResponse(savedGoal);
    }

    /**
     * Deletes a goal. Secure user checked.
     *
     * @param user   the currently authenticated user
     * @param goalId goal UUID
     */
    @Transactional
    public void deleteGoal(User user, UUID goalId) {
        Goal goal = goalRepository.findByIdAndUserId(goalId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + goalId));
        goalRepository.delete(goal);
    }
}
