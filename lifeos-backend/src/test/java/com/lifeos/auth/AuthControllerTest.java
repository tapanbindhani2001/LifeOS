package com.lifeos.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.LoginRequest;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying the registration, login, and secured endpoints logic.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void whenRegisterUser_thenSuccess() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("register@lifeos.com")
                .password("securePassword123")
                .fullName("John Doe")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("User registered successfully")))
                .andExpect(jsonPath("$.data.token", notNullValue()))
                .andExpect(jsonPath("$.data.user.email", is("register@lifeos.com")))
                .andExpect(jsonPath("$.data.user.fullName", is("John Doe")))
                .andExpect(jsonPath("$.data.user.role", is("ROLE_USER")));

        // Verify password is encrypted in database
        User dbUser = userRepository.findByEmail("register@lifeos.com").orElseThrow();
        assertThat(dbUser.getPassword()).isNotEqualTo("securePassword123");
    }

    @Test
    void whenRegisterDuplicateEmail_thenReturn400() throws Exception {
        RegisterRequest request1 = RegisterRequest.builder()
                .email("duplicate@lifeos.com")
                .password("password123")
                .fullName("First User")
                .build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)));

        RegisterRequest request2 = RegisterRequest.builder()
                .email("duplicate@lifeos.com")
                .password("anotherPassword")
                .fullName("Second User")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request2)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Email address is already in use")));
    }

    @Test
    void whenLoginWithValidCredentials_thenSuccess() throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .email("login@lifeos.com")
                .password("myPassword123")
                .fullName("Login User")
                .build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)));

        LoginRequest login = LoginRequest.builder()
                .email("login@lifeos.com")
                .password("myPassword123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("User authenticated successfully")))
                .andExpect(jsonPath("$.data.token", notNullValue()));
    }

    @Test
    void whenLoginWithInvalidPassword_thenReturn400() throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .email("loginfail@lifeos.com")
                .password("myPassword123")
                .fullName("Login User")
                .build();
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)));

        LoginRequest login = LoginRequest.builder()
                .email("loginfail@lifeos.com")
                .password("wrongPassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Invalid email or password")));
    }

    @Test
    void whenAccessSecuredRouteWithoutToken_thenReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/test-secure"))
                .andExpect(status().isForbidden());
    }

    @Test
    void whenAccessSecuredRouteWithValidToken_thenSuccess() throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .email("authcheck@lifeos.com")
                .password("myPassword123")
                .fullName("Auth User")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> map = objectMapper.readValue(responseContent, Map.class);
        Map<?, ?> dataMap = (Map<?, ?>) map.get("data");
        String token = (String) dataMap.get("token");

        mockMvc.perform(get("/api/v1/test-secure")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound()); // NotFound means the request bypassed security filters (did not yield 403) and hit dispatcher mapping.
    }
}
