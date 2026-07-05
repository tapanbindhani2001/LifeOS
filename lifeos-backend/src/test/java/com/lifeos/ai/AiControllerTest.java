package com.lifeos.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.ai.dto.CreateConversationRequest;
import com.lifeos.ai.dto.CreateMessageRequest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying AiController conversation setup,
 * chronological chain ordering, cascading deletions, and boundary checks.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AiConversationRepository aiConversationRepository;

    @Autowired
    private AiMessageRepository aiMessageRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String user1Token;
    private String user2Token;

    @BeforeEach
    void setUp() throws Exception {
        aiMessageRepository.deleteAll();
        aiConversationRepository.deleteAll();
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
    void whenCreateConversation_thenSuccess() throws Exception {
        CreateConversationRequest request = CreateConversationRequest.builder()
                .title("Planning my week")
                .build();

        mockMvc.perform(post("/api/v1/ai/conversations")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Conversation created successfully")))
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("Planning my week")));
    }

    @Test
    void whenAddAndGetMessages_thenReturnChronologicalChain() throws Exception {
        // 1. Create Conversation
        CreateConversationRequest convReq = CreateConversationRequest.builder().title("Fitness Plan").build();
        MvcResult result = mockMvc.perform(post("/api/v1/ai/conversations")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(convReq)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String convId = (String) dataMap.get("id");

        // 2. Append User message
        CreateMessageRequest msg1 = CreateMessageRequest.builder()
                .role(MessageRole.USER)
                .content("How to run a 5k?")
                .build();

        mockMvc.perform(post("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role", is("USER")))
                .andExpect(jsonPath("$.data.content", is("How to run a 5k?")));

        // 3. Append Assistant response
        CreateMessageRequest msg2 = CreateMessageRequest.builder()
                .role(MessageRole.ASSISTANT)
                .content("Start with interval walking.")
                .build();

        mockMvc.perform(post("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg2)))
                .andExpect(status().isOk());

        // 4. List messages (sorted chronologically)
        mockMvc.perform(get("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].role", is("USER")))
                .andExpect(jsonPath("$.data[1].role", is("ASSISTANT")));
    }

    @Test
    void whenDeleteConversation_thenClearCascade() throws Exception {
        // Create
        CreateConversationRequest convReq = CreateConversationRequest.builder().title("To Delete").build();
        MvcResult result = mockMvc.perform(post("/api/v1/ai/conversations")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(convReq)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String convId = (String) dataMap.get("id");

        // Add message
        CreateMessageRequest msg = CreateMessageRequest.builder().role(MessageRole.USER).content("Hello").build();
        mockMvc.perform(post("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg)))
                .andExpect(status().isOk());

        // Delete
        mockMvc.perform(delete("/api/v1/ai/conversations/" + convId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Conversation deleted successfully")));

        // Verify cleared
        assertThat(aiConversationRepository.findById(java.util.UUID.fromString(convId)).isPresent()).isFalse();
    }

    @Test
    void whenAccessOtherUsersConversation_thenReturn404() throws Exception {
        // User 2 creates conversation
        CreateConversationRequest convReq = CreateConversationRequest.builder().title("Private Chat").build();
        MvcResult result = mockMvc.perform(post("/api/v1/ai/conversations")
                        .header("Authorization", "Bearer " + user2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(convReq)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String convId = (String) dataMap.get("id");

        // User 1 tries to list messages
        mockMvc.perform(get("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());

        // User 1 tries to add message
        CreateMessageRequest msg = CreateMessageRequest.builder().role(MessageRole.USER).content("Hack").build();
        mockMvc.perform(post("/api/v1/ai/conversations/" + convId + "/messages")
                        .header("Authorization", "Bearer " + user1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg)))
                .andExpect(status().isNotFound());

        // User 1 tries to delete conversation
        mockMvc.perform(delete("/api/v1/ai/conversations/" + convId)
                        .header("Authorization", "Bearer " + user1Token))
                .andExpect(status().isNotFound());
    }
}
