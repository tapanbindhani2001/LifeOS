package com.lifeos.user;

import com.lifeos.common.exception.BadRequestException;
import com.lifeos.user.dto.UpdatePasswordRequest;
import com.lifeos.user.dto.UpdateProfileRequest;
import com.lifeos.user.dto.UserResponse;
import com.lifeos.user.dto.RegisterDeviceRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

/**
 * Service class handling user profile queries, profile updates, and password updates.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserDeviceRepository userDeviceRepository;

    /**
     * Constructs a UserService.
     *
     * @param userRepository  the repository for user database actions
     * @param passwordEncoder helper for matching and hashing passwords
     * @param userDeviceRepository the repository for user device registration
     */
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, UserDeviceRepository userDeviceRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userDeviceRepository = userDeviceRepository;
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
                .profilePicture(user.getProfilePicture())
                .build();
    }

    /**
     * Updates full name and profile picture of the user profile.
     *
     * @param user    the currently authenticated user entity
     * @param request profile update DTO containing new full name and optional profile picture
     * @return updated UserResponse DTO
     */
    @Transactional
    public UserResponse updateProfile(User user, UpdateProfileRequest request) {
        user.setFullName(request.getFullName());
        user.setProfilePicture(request.getProfilePicture());
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

    /**
     * Registers or updates a device push token for the given user.
     *
     * @param user    the currently authenticated user entity
     * @param request device registration details
     */
    @Transactional
    public void registerDevice(User user, RegisterDeviceRequest request) {
        Optional<UserDevice> existingOpt = userDeviceRepository.findByExpoPushToken(request.getExpoPushToken());
        if (existingOpt.isPresent()) {
            UserDevice device = existingOpt.get();
            device.setUser(user);
            device.setPlatform(request.getPlatform());
            userDeviceRepository.save(device);
        } else {
            UserDevice device = UserDevice.builder()
                    .user(user)
                    .expoPushToken(request.getExpoPushToken())
                    .platform(request.getPlatform())
                    .build();
            userDeviceRepository.save(device);
        }
    }
}
