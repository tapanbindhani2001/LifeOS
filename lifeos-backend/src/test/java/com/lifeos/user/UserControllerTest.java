package com.lifeos.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.user.dto.UpdatePasswordRequest;
import com.lifeos.user.dto.UpdateProfileRequest;
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

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying UserController endpoints and authorization.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();

        // Create test user and obtain token
        RegisterRequest register = RegisterRequest.builder()
                .email("profile@lifeos.com")
                .password("password123")
                .fullName("Original Name")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        token = (String) dataMap.get("token");
    }

    @Test
    void whenGetMe_thenSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Fetched current user details successfully")))
                .andExpect(jsonPath("$.data.email", is("profile@lifeos.com")))
                .andExpect(jsonPath("$.data.fullName", is("Original Name")))
                .andExpect(jsonPath("$.data.role", is("ROLE_USER")));
    }

    @Test
    void whenGetMeWithoutToken_thenReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    void whenUpdateProfile_thenSuccess() throws Exception {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Updated Name")
                .build();

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Profile updated successfully")))
                .andExpect(jsonPath("$.data.fullName", is("Updated Name")));
    }

    @Test
    void whenUpdatePassword_thenSuccess() throws Exception {
        UpdatePasswordRequest request = UpdatePasswordRequest.builder()
                .oldPassword("password123")
                .newPassword("newPassword123")
                .build();

        mockMvc.perform(put("/api/v1/users/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Password updated successfully")));
    }

    @Test
    void whenUpdatePasswordWithWrongOldPassword_thenReturn400() throws Exception {
        UpdatePasswordRequest request = UpdatePasswordRequest.builder()
                .oldPassword("wrongPassword")
                .newPassword("newPassword123")
                .build();

        mockMvc.perform(put("/api/v1/users/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Current password is incorrect")));
    }
}
