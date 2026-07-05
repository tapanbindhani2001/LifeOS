package com.lifeos.user;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.user.dto.UpdatePasswordRequest;
import com.lifeos.user.dto.UpdateProfileRequest;
import com.lifeos.user.dto.UserResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service class handling user profile queries, profile updates, and password updates.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Constructs a UserService.
     *
     * @param userRepository  the repository for user database actions
     * @param passwordEncoder helper for matching and hashing passwords
     */
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Map User entity to UserResponse DTO.
     *
     * @param user the User entity
     * @return UserResponse DTO
     */
    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }

    /**
     * Updates full name of the user profile.
     *
     * @param user    the currently authenticated user entity
     * @param request profile update DTO containing new full name
     * @return updated UserResponse DTO
     */
    @Transactional
    public UserResponse updateProfile(User user, UpdateProfileRequest request) {
        user.setFullName(request.getFullName());
        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    /**
     * Secures and updates user account passwords.
     *
     * @param user    the currently authenticated user entity
     * @param request password change DTO (old and new passwords)
     */
    @Transactional
    public void updatePassword(User user, UpdatePasswordRequest request) {
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
