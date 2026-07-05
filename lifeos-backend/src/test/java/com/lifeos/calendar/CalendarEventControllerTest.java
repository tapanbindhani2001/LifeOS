package com.lifeos.calendar;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.calendar.dto.CreateCalendarEventRequest;
import com.lifeos.calendar.dto.UpdateCalendarEventRequest;
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
 * Web integration tests verifying CalendarEventController endpoint operations,
 * range filtering queries, validation constraints, and cross-user scoping bounds.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CalendarEventControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CalendarEventRepository calendarEventRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        calendarEventRepository.deleteAll();
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
    void whenCreateEvent_thenSuccess() throws Exception {
        Instant startTime = Instant.parse("2026-07-05T10:00:00Z");
        Instant endTime = Instant.parse("2026-07-05T11:00:00Z");

        CreateCalendarEventRequest request = CreateCalendarEventRequest.builder()
                .title("Team Standup")
                .description("Daily sync meeting")
                .startTime(startTime)
                .endTime(endTime)
                .location("Meeting Room A")
                .color("#EF4444")
                .build();

        mockMvc.perform(post("/api/v1/calendar/events")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Calendar event created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("Team Standup")))
                .andExpect(jsonPath("$.data.description", is("Daily sync meeting")))
                .andExpect(jsonPath("$.data.startTime", is("2026-07-05T10:00:00Z")))
                .andExpect(jsonPath("$.data.endTime", is("2026-07-05T11:00:00Z")))
                .andExpect(jsonPath("$.data.location", is("Meeting Room A")))
                .andExpect(jsonPath("$.data.color", is("#EF4444")));
    }

    @Test
    void whenCreateEventWithEndBeforeStart_thenReturn400() throws Exception {
        Instant startTime = Instant.parse("2026-07-05T12:00:00Z");
        Instant endTime = Instant.parse("2026-07-05T11:00:00Z"); // Invalid: end before start

        CreateCalendarEventRequest request = CreateCalendarEventRequest.builder()
                .title("Broken Event")
                .startTime(startTime)
                .endTime(endTime)
                .build();

        mockMvc.perform(post("/api/v1/calendar/events")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("End time must be after start time")));
    }

    @Test
    void whenGetEventsRange_thenReturnFilteredEvents() throws Exception {
        // Create 3 events for User 1:
        // Event 1: July 5, 10:00 - 11:00
        CreateCalendarEventRequest event1 = CreateCalendarEventRequest.builder()
                .title("Event 1")
                .startTime(Instant.parse("2026-07-05T10:00:00Z"))
                .endTime(Instant.parse("2026-07-05T11:00:00Z"))
                .build();
        // Event 2: July 6, 10:00 - 11:00
        CreateCalendarEventRequest event2 = CreateCalendarEventRequest.builder()
                .title("Event 2")
                .startTime(Instant.parse("2026-07-06T10:00:00Z"))
                .endTime(Instant.parse("2026-07-06T11:00:00Z"))
                .build();
        // Event 3: July 7, 10:00 - 11:00
        CreateCalendarEventRequest event3 = CreateCalendarEventRequest.builder()
                .title("Event 3")
                .startTime(Instant.parse("2026-07-07T10:00:00Z"))
                .endTime(Instant.parse("2026-07-07T11:00:00Z"))
                .build();

        mockMvc.perform(post("/api/v1/calendar/events").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(event1)));
        mockMvc.perform(post("/api/v1/calendar/events").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(event2)));
        mockMvc.perform(post("/api/v1/calendar/events").header("Authorization", "Bearer " + user1Token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(event3)));

        // Request events in range: July 5 00:00 to July 6 23:59 (should return Event 1 and Event 2)
        mockMvc.perform(get("/api/v1/calendar/events")
                        .header("Authorization", "Bearer " + user1Token)
                        .param("start", "2026-07-05T00:00:00Z")
                        .param("end", "2026-07-06T23:59:59Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", is("Event 1")))
                .andExpect(jsonPath("$.data[1].title", is("Event 2")));
    }

    @Test
    void whenAccessOtherUsersEvent_thenReturn404() throws Exception {
        // User 2 creates event
        CreateCalendarEventRequest request = CreateCalendarEventRequest.builder()
                .title("User 2 Event")
                .startTime(Instant.parse("2026-07-05T10:00:00Z"))
                .endTime(Instant.parse("2026-07-05T11:00:00Z"))
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/calendar/events")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String eventId = (String) dataMap.get("id");

        // User 1 tries to fetch it
        mockMvc.perform(get("/api/v1/calendar/events/" + eventId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to update it
        UpdateCalendarEventRequest update = UpdateCalendarEventRequest.builder()
                .title("Hacked Title")
                .startTime(Instant.parse("2026-07-05T10:00:00Z"))
                .endTime(Instant.parse("2026-07-05T11:00:00Z"))
                .build();
        mockMvc.perform(put("/api/v1/calendar/events/" + eventId)
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete it
        mockMvc.perform(delete("/api/v1/calendar/events/" + eventId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
