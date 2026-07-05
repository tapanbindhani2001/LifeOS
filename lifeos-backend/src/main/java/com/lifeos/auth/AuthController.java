package com.lifeos.auth;

import com.lifeos.auth.dto.AuthResponse;
import com.lifeos.auth.dto.LoginRequest;
import com.lifeos.auth.dto.RegisterRequest;
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
}
