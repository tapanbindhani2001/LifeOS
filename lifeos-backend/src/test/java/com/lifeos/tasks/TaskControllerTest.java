package com.lifeos.tasks;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.tasks.dto.CreateTaskRequest;
import com.lifeos.tasks.dto.UpdateTaskRequest;
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

import java.time.Instant;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying TaskController endpoint operations,
 * sorting metrics, JSR validations, and cross-user scoping bounds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        taskRepository.deleteAll();
        userRepository.deleteAll();

        // Create user 1 and get token
        RegisterRequest register1 = RegisterRequest.builder()
                .email("user1@lifeos.com")
                .password("password123")
                .fullName("User One")
                .build();
        user1Token = obtainToken(register1);

        // Create user 2 and get token
        RegisterRequest register2 = RegisterRequest.builder()
                .email("user2@lifeos.com")
                .password("password123")
                .fullName("User Two")
                .build();
        user2Token = obtainToken(register2);
    }

    private String obtainToken(RegisterRequest request) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        String content = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(content, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        return (String) dataMap.get("token");
    }

    @Test
    void whenCreateTask_thenSuccess() throws Exception {
        CreateTaskRequest request = CreateTaskRequest.builder()
                .title("Complete React UI")
                .description("Build out all visual dashboard panels")
                .completed(false)
                .priority(Priority.HIGH)
                .category("Work")
                .dueDate(Instant.now().plusSeconds(86400))
                .build();

        mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Task created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("Complete React UI")))
                .andExpect(jsonPath("$.data.description", is("Build out all visual dashboard panels")))
                .andExpect(jsonPath("$.data.completed", is(false)))
                .andExpect(jsonPath("$.data.priority", is("HIGH")))
                .andExpect(jsonPath("$.data.category", is("Work")))
                .andExpect(jsonPath("$.data.dueDate", notNullValue()));
    }

    @Test
    void whenCreateTaskWithMissingMandatory_thenReturn400() throws Exception {
        CreateTaskRequest request = CreateTaskRequest.builder()
                .title("") // Blank title
                .priority(null) // Null priority
                .build();

        mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.title", is("Title is required")))
                .andExpect(jsonPath("$.errors.priority", is("Priority is required")));
    }

    @Test
    void whenGetTasks_thenReturnOnlyUserTasksSorted() throws Exception {
        // Create tasks for User 1: complete, uncompleted with far due date, uncompleted with near due date
        CreateTaskRequest task1 = CreateTaskRequest.builder().title("Task 1").completed(true).priority(Priority.LOW).build();
        CreateTaskRequest task2 = CreateTaskRequest.builder().title("Task 2").completed(false).priority(Priority.MEDIUM).dueDate(Instant.now().plusSeconds(172800)).build(); // Due 2 days from now
        CreateTaskRequest task3 = CreateTaskRequest.builder().title("Task 3").completed(false).priority(Priority.HIGH).dueDate(Instant.now().plusSeconds(86400)).build(); // Due 1 day from now

        mockMvc.perform(post("/api/v1/tasks").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task1)));
        mockMvc.perform(post("/api/v1/tasks").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task2)));
        mockMvc.perform(post("/api/v1/tasks").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(task3)));

        // Create 1 task for User 2
        CreateTaskRequest user2Task = CreateTaskRequest.builder().title("User 2 Task").priority(Priority.LOW).build();
        mockMvc.perform(post("/api/v1/tasks").header("Authorization", "Bearer " + user2Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(user2Task)));

        // Retrieve tasks for User 1
        mockMvc.perform(get("/api/v1/tasks")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(3)))
                // Sort checks: Uncompleted tasks first, then by due date: Task 3 (Due in 1 day) -> Task 2 (Due in 2 days) -> Task 1 (Completed)
                .andExpect(jsonPath("$.data[0].title", is("Task 3")))
                .andExpect(jsonPath("$.data[0].completed", is(false)))
                .andExpect(jsonPath("$.data[1].title", is("Task 2")))
                .andExpect(jsonPath("$.data[1].completed", is(false)))
                .andExpect(jsonPath("$.data[2].title", is("Task 1")))
                .andExpect(jsonPath("$.data[2].completed", is(true)));
    }

    @Test
    void whenAccessOtherUsersTask_thenReturn404() throws Exception {
        // User 2 creates a task
        CreateTaskRequest request = CreateTaskRequest.builder().title("Private Task").priority(Priority.LOW).build();
        MvcResult result = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String taskId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/tasks/" + taskId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateTaskRequest update = UpdateTaskRequest.builder().title("Hacked Title").priority(Priority.HIGH).build();
        mockMvc.perform(put("/api/v1/tasks/" + taskId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/tasks/" + taskId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }

    @Test
    void whenToggleComplete_thenStatusInverts() throws Exception {
        // Create task for User 1
        CreateTaskRequest create = CreateTaskRequest.builder().title("Task").priority(Priority.LOW).completed(false).build();
        MvcResult result = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String taskId = (String) dataMap.get("id");

        // Complete the task
        mockMvc.perform(put("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completed", is(true)));

        // Uncomplete the task
        mockMvc.perform(put("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completed", is(false)));
    }
}
