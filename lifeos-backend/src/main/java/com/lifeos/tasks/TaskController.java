package com.lifeos.tasks;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.tasks.dto.CreateTaskRequest;
import com.lifeos.tasks.dto.TaskResponse;
import com.lifeos.tasks.dto.UpdateTaskRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing secure endpoints to create, view, edit, complete, and delete user tasks.
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    /**
     * Constructs TaskController.
     *
     * @param taskService service handling tasks business rules
     */
    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * Retrieves all tasks belonging to the authenticated user.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing sorted list of TaskResponse DTOs
     */
    @GetMapping
    public ApiResponse<List<TaskResponse>> getTasks(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        List<TaskResponse> response = taskService.getUserTasks(userDetails.getUser());
        return ApiResponse.success(response, "Fetched tasks successfully");
    }

    /**
     * Retrieves details of a specific task.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          task UUID
     * @return standard ApiResponse containing TaskResponse DTO
     */
    @GetMapping("/{id}")
    public ApiResponse<TaskResponse> getTaskById(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        TaskResponse response = taskService.getTaskById(userDetails.getUser(), id);
        return ApiResponse.success(response, "Fetched task successfully");
    }

    /**
     * Creates a new task.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     create task payload DTO
     * @return standard ApiResponse containing created TaskResponse DTO
     */
    @PostMapping
    public ApiResponse<TaskResponse> createTask(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        TaskResponse response = taskService.createTask(userDetails.getUser(), request);
        return ApiResponse.success(response, "Task created successfully");
    }

    /**
     * Updates properties of a task.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          task UUID
     * @param request     update task payload DTO
     * @return standard ApiResponse containing updated TaskResponse DTO
     */
    @PutMapping("/{id}")
    public ApiResponse<TaskResponse> updateTask(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        TaskResponse response = taskService.updateTask(userDetails.getUser(), id, request);
        return ApiResponse.success(response, "Task updated successfully");
    }

    /**
     * Toggles complete status of a task.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          task UUID
     * @return standard ApiResponse containing updated TaskResponse DTO
     */
    @PutMapping("/{id}/complete")
    public ApiResponse<TaskResponse> toggleComplete(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        TaskResponse response = taskService.toggleComplete(userDetails.getUser(), id);
        return ApiResponse.success(response, "Task completion status updated successfully");
    }

    /**
     * Deletes a task.
     *
     * @param userDetails Spring security principal wrapper
     * @param id          task UUID
     * @return standard ApiResponse with success message
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteTask(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        taskService.deleteTask(userDetails.getUser(), id);
        return ApiResponse.successWithMessage("Task deleted successfully");
    }
}
