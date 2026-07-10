package com.lifeos.auth;

import com.lifeos.auth.dto.AuthResponse;
import com.lifeos.auth.dto.LoginRequest;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.auth.dto.ForgotPasswordRequest;
import com.lifeos.auth.dto.ResetPasswordRequest;
import com.lifeos.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller exposing public endpoints for user signup and authentication.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    /**
     * Constructs AuthController using constructor injection.
     *
     * @param authService auth business logic handler
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Register a new user profile.
     *
     * @param request register payload DTO
     * @return standard ApiResponse wrapping AuthResponse DTO
     */
    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ApiResponse.success(response, "User registered successfully");
    }

    /**
     * Login using email credentials.
     *
     * @param request login payload DTO
     * @return standard ApiResponse wrapping AuthResponse DTO
     */
    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ApiResponse.success(response, "User authenticated successfully");
    }

    /**
     * Request a password reset code.
     *
     * @param request forgot password DTO containing email
     * @return ApiResponse containing the success message and generated reset code (for testing)
     */
    @PostMapping("/forgot-password")
    public ApiResponse<java.util.Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        java.util.Map<String, String> response = authService.forgotPassword(request);
        return ApiResponse.success(response, "Password reset code sent successfully");
    }

    /**
     * Confirm password reset using OTP.
     *
     * @param request reset password DTO containing email, code, and new password
     * @return ApiResponse confirming the password has been reset
     */
    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.success(null, "Password reset successfully");
    }
}
