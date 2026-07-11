package com.lifeos.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object capturing push notification device registration details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDeviceRequest {

    @NotBlank(message = "Expo push token is required")
    private String expoPushToken;

    private String platform;
}
