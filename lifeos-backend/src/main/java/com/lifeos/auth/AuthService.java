package com.lifeos.auth;

import com.lifeos.auth.dto.AuthResponse;
import com.lifeos.auth.dto.LoginRequest;
import com.lifeos.auth.dto.RegisterRequest;
import com.lifeos.auth.dto.ForgotPasswordRequest;
import com.lifeos.auth.dto.ResetPasswordRequest;
import com.lifeos.user.dto.UserResponse;
import com.lifeos.common.exception.BadRequestException;
import com.lifeos.common.security.JwtService;
import com.lifeos.common.security.UserDetailsImpl;
import com.lifeos.user.Role;
import com.lifeos.user.User;
import com.lifeos.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lifeos.common.email.EmailService;

/**
 * Service class that handles business logic for user registration and authentication.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    private static class ResetCodeInfo {
        private final String code;
        private final java.time.Instant expiresAt;

        public ResetCodeInfo(String code, java.time.Instant expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }

        public String getCode() { return code; }
        public java.time.Instant getExpiresAt() { return expiresAt; }
    }

    private final java.util.Map<String, ResetCodeInfo> resetCodeMap = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Constructs AuthService using constructor injection.
     *
     * @param userRepository        the repository for user database actions
     * @param passwordEncoder       hashing helper for password protection
     * @param jwtService            helper service for JWT creation
     * @param authenticationManager security manager to validate logins
     */
    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
    }

    /**
     * Registers a new user, hashes password, saves record, and issues token.
     *
     * @param request register payload DTO
     * @return AuthResponse containing token and user profile
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email address is already in use");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.ROLE_USER)
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);
        UserDetailsImpl userDetails = new UserDetailsImpl(savedUser);
        String jwtToken = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .token(jwtToken)
                .user(mapToUserResponse(savedUser))
                .build();
    }

    /**
     * Authenticates login credentials and returns a new session token.
     *
     * @param request login payload DTO
     * @return AuthResponse containing token and user profile
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            throw new BadRequestException("Invalid email or password");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + request.getEmail()));

        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String jwtToken = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .token(jwtToken)
                .user(mapToUserResponse(user))
                .build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }

    /**
     * Generates a 6-digit password reset OTP code and stores it in memory.
     */
    @Transactional
    public java.util.Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("No account registered with this email address"));

        String code = String.format("%06d", new java.util.Random().nextInt(1000000));
        resetCodeMap.put(request.getEmail(), new ResetCodeInfo(code, java.time.Instant.now().plus(java.time.Duration.ofMinutes(5))));

        // Send OTP email
        emailService.sendResetPasswordOtp(request.getEmail(), user.getFullName(), code);

        return java.util.Map.of(
            "message", "Reset code generated and sent successfully"
        );
    }

    /**
     * Verifies the 6-digit OTP code and updates the user's password.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        ResetCodeInfo codeInfo = resetCodeMap.get(request.getEmail());
        if (codeInfo == null) {
            throw new BadRequestException("No reset request found for this email address");
        }

        if (!codeInfo.getCode().equals(request.getCode())) {
            throw new BadRequestException("Invalid reset code");
        }

        if (codeInfo.getExpiresAt().isBefore(java.time.Instant.now())) {
            resetCodeMap.remove(request.getEmail());
            throw new BadRequestException("Reset code has expired");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("User not found with this email"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetCodeMap.remove(request.getEmail());
    }
}
