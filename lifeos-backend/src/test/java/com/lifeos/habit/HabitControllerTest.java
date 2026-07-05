package com.lifeos.habit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.habit.dto.CreateHabitRequest;
import com.lifeos.habit.dto.UpdateHabitRequest;
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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying HabitController configurations,
 * toggles, recursive streak algorithms, and access boundaries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HabitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HabitRepository habitRepository;

    @Autowired
    private HabitLogRepository habitLogRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        habitLogRepository.deleteAll();
        habitRepository.deleteAll();
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
    void whenCreateHabit_thenSuccess() throws Exception {
        CreateHabitRequest request = CreateHabitRequest.builder()
                .name("Read 10 pages")
                .description("Daily non-fiction book reading")
                .frequency(HabitFrequency.DAILY)
                .build();

        mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Habit created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.name", is("Read 10 pages")))
                .andExpect(jsonPath("$.data.frequency", is("DAILY")))
                .andExpect(jsonPath("$.data.currentStreak", is(0)))
                .andExpect(jsonPath("$.data.bestStreak", is(0)))
                .andExpect(jsonPath("$.data.completedToday", is(false)));
    }

    @Test
    void whenToggleHabitCheckin_thenLogStateInverts() throws Exception {
        // Create habit
        CreateHabitRequest create = CreateHabitRequest.builder()
                .name("Workout")
                .frequency(HabitFrequency.DAILY)
                .build();
        MvcResult result = mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn();
        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String habitId = (String) dataMap.get("id");

        LocalDate today = LocalDate.now();

        // 1. Toggle today -> completedToday becomes true
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedToday", is(true)))
                .andExpect(jsonPath("$.data.currentStreak", is(1)))
                .andExpect(jsonPath("$.data.bestStreak", is(1)));

        // 2. Toggle today again -> completedToday becomes false, logs deleted
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.completedToday", is(false)))
                .andExpect(jsonPath("$.data.currentStreak", is(0)))
                .andExpect(jsonPath("$.data.bestStreak", is(0)));
    }

    @Test
    void whenMultiDayCheckins_thenCalculateStreaksCorrectly() throws Exception {
        // Create habit
        CreateHabitRequest create = CreateHabitRequest.builder()
                .name("Meditation")
                .frequency(HabitFrequency.DAILY)
                .build();
        MvcResult result = mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn();
        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String habitId = (String) dataMap.get("id");

        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate twoDaysAgo = today.minusDays(2);

        // Check-in: today, yesterday, and two days ago (streak = 3)
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle").header("Authorization", "Bearer " + user1Token).param("date", today.toString()));
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle").header("Authorization", "Bearer " + user1Token).param("date", yesterday.toString()));
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle")
                        .header("Authorization", "Bearer " + user1Token)
                        .param("date", twoDaysAgo.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak", is(3)))
                .andExpect(jsonPath("$.data.bestStreak", is(3)));

        // Remove "yesterday" (leaving: today + two days ago, gap in between)
        // Current streak should fall to 1 (only today is completed back-to-back), but Best Streak remains at 3
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle")
                        .header("Authorization", "Bearer " + user1Token)
                        .param("date", yesterday.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak", is(1)))
                .andExpect(jsonPath("$.data.bestStreak", is(3)));
    }

    @Test
    void whenAccessOtherUsersHabit_thenReturn404() throws Exception {
        // User 2 creates habit
        CreateHabitRequest create = CreateHabitRequest.builder().name("User 2 Habit").frequency(HabitFrequency.DAILY).build();
        MvcResult result = mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(create)))
                .andReturn();
        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String habitId = (String) dataMap.get("id");

        // User 1 tries to toggle it
        mockMvc.perform(post("/api/v1/habits/" + habitId + "/toggle")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateHabitRequest update = UpdateHabitRequest.builder().name("Hacked").frequency(HabitFrequency.DAILY).build();
        mockMvc.perform(put("/api/v1/habits/" + habitId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/habits/" + habitId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
