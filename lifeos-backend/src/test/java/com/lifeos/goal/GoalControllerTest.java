package com.lifeos.goal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.goal.dto.CreateGoalRequest;
import com.lifeos.goal.dto.UpdateGoalRequest;
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

import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying GoalController configurations,
 * boundary progress constraints, auto-completion sync rules, and access bounds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GoalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        goalRepository.deleteAll();
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
    void whenCreateGoal_thenSuccess() throws Exception {
        CreateGoalRequest request = CreateGoalRequest.builder()
                .title("Save $10,000")
                .description("Emergency fund build")
                .targetDate(LocalDate.of(2026, 12, 31))
                .progress(25)
                .build();

        mockMvc.perform(post("/api/v1/goals")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Goal created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("Save $10,000")))
                .andExpect(jsonPath("$.data.progress", is(25)))
                .andExpect(jsonPath("$.data.completed", is(false)))
                .andExpect(jsonPath("$.data.targetDate", is("2026-12-31")));
    }

    @Test
    void whenCreateGoalWithInvalidProgress_thenReturn400() throws Exception {
        CreateGoalRequest request = CreateGoalRequest.builder()
                .title("Broken Progress")
                .progress(150) // Invalid: progress > 100
                .build();

        mockMvc.perform(post("/api/v1/goals")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Validation failed")))
                .andExpect(jsonPath("$.errors.progress", is("Progress cannot exceed 100")));
    }

    @Test
    void whenUpdateProgressTo100_thenAutoMarkCompleted() throws Exception {
        // Create a goal with 50% progress
        CreateGoalRequest request = CreateGoalRequest.builder()
                .title("Run Marathon")
                .progress(50)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/goals")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String goalId = (String) dataMap.get("id");

        // 1. Update progress to 100 -> completed becomes true
        UpdateGoalRequest update1 = UpdateGoalRequest.builder()
                .title("Run Marathon")
                .progress(100)
                .build();

        mockMvc.perform(put("/api/v1/goals/" + goalId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progress", is(100)))
                .andExpect(jsonPath("$.data.completed", is(true)));

        // 2. Update progress back below 100 -> completed becomes false again
        UpdateGoalRequest update2 = UpdateGoalRequest.builder()
                .title("Run Marathon")
                .progress(95)
                .build();

        mockMvc.perform(put("/api/v1/goals/" + goalId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.progress", is(95)))
                .andExpect(jsonPath("$.data.completed", is(false)));
    }

    @Test
    void whenAccessOtherUsersGoal_thenReturn404() throws Exception {
        // User 2 adds a goal
        CreateGoalRequest request = CreateGoalRequest.builder().title("Private Goal").progress(10).build();
        MvcResult result = mockMvc.perform(post("/api/v1/goals")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String goalId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/goals/" + goalId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateGoalRequest update = UpdateGoalRequest.builder().title("Hacked Title").progress(100).build();
        mockMvc.perform(put("/api/v1/goals/" + goalId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/goals/" + goalId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
