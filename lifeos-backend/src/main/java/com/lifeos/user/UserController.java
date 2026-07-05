package com.lifeos.user;

import com.lifeos.common.response.ApiResponse;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.user.dto.UpdatePasswordRequest;
import com.lifeos.user.dto.UpdateProfileRequest;
import com.lifeos.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller exposing endpoints for authenticated user profile retrieval and management.
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    /**
     * Constructs UserController using constructor injection.
     *
     * @param userService user profile service handler
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Get currently authenticated user details.
     *
     * @param userDetails Spring security principal wrapper
     * @return standard ApiResponse containing UserResponse DTO
     */
    @GetMapping("/me")
    public ApiResponse<UserResponse> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserResponse response = userService.mapToUserResponse(userDetails.getUser());
        return ApiResponse.success(response, "Fetched current user details successfully");
    }

    /**
     * Update user profile information.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     profile update DTO containing new name
     * @return standard ApiResponse containing updated UserResponse DTO
     */
    @PutMapping("/profile")
    public ApiResponse<UserResponse> updateProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = userService.updateProfile(userDetails.getUser(), request);
        return ApiResponse.success(response, "Profile updated successfully");
    }

    /**
     * Update user password.
     *
     * @param userDetails Spring security principal wrapper
     * @param request     password change DTO
     * @return standard ApiResponse with success message
     */
    @PutMapping("/password")
    public ApiResponse<Void> updatePassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UpdatePasswordRequest request
    ) {
        userService.updatePassword(userDetails.getUser(), request);
        return ApiResponse.successWithMessage("Password updated successfully");
    }
}
