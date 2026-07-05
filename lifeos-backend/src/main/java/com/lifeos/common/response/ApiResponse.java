package com.lifeos.common.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;

/**
 * Standard generic API response wrapper for all REST endpoints in the LifeOS application.
 *
 * @param <T> the type of the payload data
 */
@Getter
@Builder
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;
    private final Instant timestamp;
    private final Map<String, String> errors;

    /**
     * Creates a successful API response with data and message.
     *
     * @param data    the response payload
     * @param message the success message
     * @param <T>     the type of the payload data
     * @return the ApiResponse instance
     */
    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Creates a successful API response with data.
     *
     * @param data the response payload
     * @param <T>  the type of the payload data
     * @return the ApiResponse instance
     */
    public static <T> ApiResponse<T> success(T data) {
        return success(data, "Operation completed successfully");
    }

    /**
     * Creates a successful API response with only a message.
     *
     * @param message the success message
     * @param <T>     the type of the payload data
     * @return the ApiResponse instance
     */
    public static <T> ApiResponse<T> successWithMessage(String message) {
        return success(null, message);
    }

    /**
     * Creates an error API response with a message and detailed error map.
     *
     * @param message the error message
     * @param errors  detailed field validation or error mapping
     * @param <T>     the type of the payload data
     * @return the ApiResponse instance
     */
    public static <T> ApiResponse<T> error(String message, Map<String, String> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errors(errors)
                .timestamp(Instant.now())
                .build();
    }

    /**
     * Creates an error API response with only a message.
     *
     * @param message the error message
     * @param <T>     the type of the payload data
     * @return the ApiResponse instance
     */
    public static <T> ApiResponse<T> error(String message) {
        return error(message, null);
    }
}
