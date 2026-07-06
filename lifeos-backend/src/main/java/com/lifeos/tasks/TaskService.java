package com.lifeos.tasks;

import com.lifeos.common.exception.ResourceNotFoundException;
import com.lifeos.tasks.dto.CreateTaskRequest;
import com.lifeos.tasks.dto.TaskResponse;
import com.lifeos.tasks.dto.UpdateTaskRequest;
import com.lifeos.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service class handling all task management business rules (creation, update, list, delete, completion toggles).
 */
@Service
public class TaskService {

    private final TaskRepository taskRepository;

    /**
     * Constructs a TaskService.
     *
     * @param taskRepository repository handling database tasks queries
     */
    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    private TaskResponse mapToTaskResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .completed(task.isCompleted())
                .priority(task.getPriority())
                .status(task.getStatus())
                .category(task.getCategory())
                .dueDate(task.getDueDate())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    /**
     * Get sorted list of user's tasks (uncompleted first, then sorted by due date, then creation time).
     *
     * @param user the currently authenticated user
     * @return sorted list of TaskResponse DTOs
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getUserTasks(User user) {
        return taskRepository.findAllByUserIdOrderByCompletedAscDueDateAscCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get specific task details. Enforces secure user boundary.
     *
     * @param user   the currently authenticated user
     * @param taskId task UUID
     * @return TaskResponse DTO
     */
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(User user, UUID taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        return mapToTaskResponse(task);
    }

    /**
     * Create a new task.
     *
     * @param user    the currently authenticated user
     * @param request the create payload DTO
     * @return the created TaskResponse DTO
     */
    @Transactional
    public TaskResponse createTask(User user, CreateTaskRequest request) {
        TaskStatus status = request.getStatus() != null ? request.getStatus() : TaskStatus.TODO;
        boolean completed = (status == TaskStatus.DONE) || request.isCompleted();
        if (completed) {
            status = TaskStatus.DONE;
        }

        Task task = Task.builder()
                .user(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .completed(completed)
                .priority(request.getPriority())
                .status(status)
                .category(request.getCategory())
                .dueDate(request.getDueDate())
                .build();

        Task savedTask = taskRepository.save(task);
        return mapToTaskResponse(savedTask);
    }

    /**
     * Update a task. Enforces secure user boundary.
     *
     * @param user    the currently authenticated user
     * @param taskId  task UUID
     * @param request update payload DTO
     * @return the updated TaskResponse DTO
     */
    @Transactional
    public TaskResponse updateTask(User user, UUID taskId, UpdateTaskRequest request) {
        Task task = taskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        TaskStatus status = request.getStatus() != null ? request.getStatus() : task.getStatus();
        boolean completed = (status == TaskStatus.DONE) || request.isCompleted();
        if (completed && status != TaskStatus.DONE) {
            status = TaskStatus.DONE;
        } else if (!completed && status == TaskStatus.DONE) {
            status = TaskStatus.TODO;
        }

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setCompleted(completed);
        task.setPriority(request.getPriority());
        task.setStatus(status);
        task.setCategory(request.getCategory());
        task.setDueDate(request.getDueDate());

        Task savedTask = taskRepository.save(task);
        return mapToTaskResponse(savedTask);
    }

    /**
     * Toggle the complete status of a task. Enforces secure user boundary.
     *
     * @param user   the currently authenticated user
     * @param taskId task UUID
     * @return the updated TaskResponse DTO
     */
    @Transactional
    public TaskResponse toggleComplete(User user, UUID taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        boolean newCompleted = !task.isCompleted();
        task.setCompleted(newCompleted);
        task.setStatus(newCompleted ? TaskStatus.DONE : TaskStatus.TODO);
        
        Task savedTask = taskRepository.save(task);
        return mapToTaskResponse(savedTask);
    }

    /**
     * Delete a task. Enforces secure user boundary.
     *
     * @param user   the currently authenticated user
     * @param taskId task UUID
     */
    @Transactional
    public void deleteTask(User user, UUID taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        taskRepository.delete(task);
    }
}
