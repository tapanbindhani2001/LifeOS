package com.lifeos.admin;

import com.lifeos.admin.dto.AdminStatsResponse;
import com.lifeos.admin.dto.AdminUserResponse;
import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.user.Role;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller exposing system metrics and account management tools to platform administrators.
 */
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    /**
     * Constructs AdminController.
     *
     * @param adminService service handling administration controls
     */
    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /**
     * Retrieves system-wide aggregates and analytics.
     *
     * @return standard ApiResponse containing AdminStatsResponse DTO
     */
    @GetMapping("/stats")
    public ApiResponse<AdminStatsResponse> getStats() {
        AdminStatsResponse stats = adminService.getSystemStats();
        return ApiResponse.success(stats, "System statistics fetched successfully");
    }

    /**
     * Retrieves a list of all registered platform user accounts.
     *
     * @return standard ApiResponse containing list of AdminUserResponse DTOs
     */
    @GetMapping("/users")
    public ApiResponse<List<AdminUserResponse>> getUsers() {
        List<AdminUserResponse> users = adminService.getAllUsers();
        return ApiResponse.success(users, "User accounts list fetched successfully");
    }

    /**
     * Flips target user account enabled state status. Enforces lockout prevention logic.
     *
     * @param userDetails Spring security principal wrapper for active administrator
     * @param id          target user UUID
     * @return standard ApiResponse containing updated AdminUserResponse DTO
     */
    @PostMapping("/users/{id}/toggle-status")
    public ApiResponse<AdminUserResponse> toggleUserStatus(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id
    ) {
        AdminUserResponse response = adminService.toggleUserStatus(userDetails.getUser(), id);
        return ApiResponse.success(response, "User account status toggled successfully");
    }

    /**
     * Alters security roles configurations on a user account. Enforces demotion prevention logic.
     *
     * @param userDetails Spring security principal wrapper for active administrator
     * @param id          target user UUID
     * @param role        target role to promote or configure
     * @return standard ApiResponse containing updated AdminUserResponse DTO
     */
    @PostMapping("/users/{id}/role")
    public ApiResponse<AdminUserResponse> updateUserRole(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable UUID id,
            @RequestParam("role") Role role
    ) {
        AdminUserResponse response = adminService.updateUserRole(userDetails.getUser(), id, role);
        return ApiResponse.success(response, "User role configuration updated successfully");
    }
}
