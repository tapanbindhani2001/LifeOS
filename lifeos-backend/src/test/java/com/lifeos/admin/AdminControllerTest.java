package com.lifeos.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.user.Role;
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
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web integration tests verifying AdminController security filters,
 * system stats aggregations, toggle-status toggles, role promotions, and self-lockout prevention blocks.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User regularUser;
    private User adminUser;
    private String regularUserToken;
    private String adminUserToken;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();

        // 1. Create Regular User
        RegisterRequest registerUser = RegisterRequest.builder()
                .email("regular@lifeos.com")
                .password("password123")
                .fullName("Regular User")
                .build();
        regularUserToken = registerAndFetchToken(registerUser, false);

        // 2. Create Admin User
        RegisterRequest registerAdmin = RegisterRequest.builder()
                .email("admin@lifeos.com")
                .password("password123")
                .fullName("System Admin")
                .build();
        adminUserToken = registerAndFetchToken(registerAdmin, true);
    }

    private String registerAndFetchToken(RegisterRequest request, boolean makeAdmin) throws Exception {
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
        User user = userRepository.findById(UUID.fromString(userIdStr)).orElseThrow();

        if (makeAdmin) {
            user.setRole(Role.ROLE_ADMIN);
            user = userRepository.save(user);
            adminUser = user;
        } else {
            regularUser = user;
        }

        return token;
    }

    @Test
    void whenRegularUserAccessesAdmin_thenReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats")
                        .header("Authorization", "Bearer " + regularUserToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void whenAdminAccessesStats_thenSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats")
                        .header("Authorization", "Bearer " + adminUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalUsers", is(2))); // regularUser + adminUser
    }

    @Test
    void whenAdminGetsUsers_thenReturnList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("Authorization", "Bearer " + adminUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void whenAdminTogglesUserStatus_thenSuccess() throws Exception {
        // Disable regular user
        mockMvc.perform(post("/api/v1/admin/users/" + regularUser.getId() + "/toggle-status")
                        .header("Authorization", "Bearer " + adminUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled", is(false)));

        // Re-enable regular user
        mockMvc.perform(post("/api/v1/admin/users/" + regularUser.getId() + "/toggle-status")
                        .header("Authorization", "Bearer " + adminUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled", is(true)));
    }

    @Test
    void whenAdminTogglesSelfStatus_thenReturn400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + adminUser.getId() + "/toggle-status")
                        .header("Authorization", "Bearer " + adminUserToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Self-lockout prevention: cannot disable your own administrator account")));
    }

    @Test
    void whenAdminUpdatesUserRole_thenSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + regularUser.getId() + "/role")
                        .header("Authorization", "Bearer " + adminUserToken)
                        .param("role", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role", is("ROLE_ADMIN")));
    }

    @Test
    void whenAdminUpdatesSelfRole_thenReturn400() throws Exception {
        mockMvc.perform(post("/api/v1/admin/users/" + adminUser.getId() + "/role")
                        .header("Authorization", "Bearer " + adminUserToken)
                        .param("role", "ROLE_USER"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Self-lockout prevention: cannot modify your own administrator role")));
    }
}
