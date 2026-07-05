package com.lifeos.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.user.User;
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

import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying NotificationController sorting rules,
 * unread count trackers, single mark-as-read toggles, JPQL O(1) bulk mark-all-as-read edits,
 * and scope boundaries.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User user1;
    private User user2;
    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        // Create user 1 and get token
        RegisterRequest register1 = RegisterRequest.builder()
                .email("user1@lifeos.com")
                .password("password123")
                .fullName("User One")
                .build();
        user1Token = obtainTokenAndSetUser(register1, true);

        // Create user 2 and get token
        RegisterRequest register2 = RegisterRequest.builder()
                .email("user2@lifeos.com")
                .password("password123")
                .fullName("User Two")
                .build();
        user2Token = obtainTokenAndSetUser(register2, false);
    }

    private String obtainTokenAndSetUser(RegisterRequest request, boolean isUser1) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        String content = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(content, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String token = (String) dataMap.get("token");

        Map<?, ?> userMap = (Map<?, ?>) dataMap.get("user");
        String userIdStr = (String) userMap.get("id");
        User user = userRepository.findById(java.util.UUID.fromString(userIdStr)).orElseThrow();
        if (isUser1) {
            user1 = user;
        } else {
            user2 = user;
        }
        return token;
    }

    @Test
    void whenGetNotifications_thenReturnSortedList() throws Exception {
        Notification n1 = Notification.builder()
                .user(user1)
                .title("Reminder 1")
                .message("Message 1")
                .read(true)
                .type(NotificationType.REMINDER)
                .build();
        Notification n2 = Notification.builder()
                .user(user1)
                .title("Reminder 2")
                .message("Message 2")
                .read(false) // Unread should be first
                .type(NotificationType.ALERT)
                .build();
        notificationRepository.save(n1);
        notificationRepository.save(n2);

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].title", is("Reminder 2")))
                .andExpect(jsonPath("$.data[0].read", is(false)))
                .andExpect(jsonPath("$.data[1].title", is("Reminder 1")))
                .andExpect(jsonPath("$.data[1].read", is(true)));
    }

    @Test
    void whenGetUnreadCount_thenReturnCorrectCount() throws Exception {
        Notification n1 = Notification.builder()
                .user(user1)
                .title("Alert 1")
                .message("Message 1")
                .read(false)
                .type(NotificationType.ALERT)
                .build();
        Notification n2 = Notification.builder()
                .user(user1)
                .title("Alert 2")
                .message("Message 2")
                .read(true)
                .type(NotificationType.ALERT)
                .build();
        notificationRepository.save(n1);
        notificationRepository.save(n2);

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", is(1)));
    }

    @Test
    void whenMarkAsRead_thenStatusUpdates() throws Exception {
        Notification n = Notification.builder()
                .user(user1)
                .title("System update")
                .message("Database clean complete")
                .read(false)
                .type(NotificationType.SYSTEM)
                .build();
        n = notificationRepository.save(n);

        mockMvc.perform(post("/api/v1/notifications/" + n.getId() + "/read")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.read", is(true)));
    }

    @Test
    void whenMarkAllAsRead_thenAllUnreadBecomeRead() throws Exception {
        Notification n1 = Notification.builder()
                .user(user1)
                .title("Update 1")
                .message("Text 1")
                .read(false)
                .type(NotificationType.SYSTEM)
                .build();
        Notification n2 = Notification.builder()
                .user(user1)
                .title("Update 2")
                .message("Text 2")
                .read(false)
                .type(NotificationType.SYSTEM)
                .build();
        notificationRepository.save(n1);
        notificationRepository.save(n2);

        mockMvc.perform(post("/api/v1/notifications/read-all")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("All notifications marked as read successfully")));

        // Verify count is now 0
        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", is(0)));
    }

    @Test
    void whenAccessOtherUsersNotification_thenReturn404() throws Exception {
        Notification n = Notification.builder()
                .user(user2)
                .title("Private")
                .message("Confidential")
                .read(false)
                .type(NotificationType.ALERT)
                .build();
        n = notificationRepository.save(n);

        mockMvc.perform(post("/api/v1/notifications/" + n.getId() + "/read")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/notifications/" + n.getId())
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
