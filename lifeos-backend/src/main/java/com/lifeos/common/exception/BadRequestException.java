package com.lifeos.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception representing an HTTP 400 Bad Request error.
 */
public class BadRequestException extends BaseException {

    private static final String DEFAULT_ERROR_CODE = "BAD_REQUEST";

    /**
     * Constructs a BadRequestException with the specified detail message.
     *
     * @param message the detail message
     */
    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST, DEFAULT_ERROR_CODE);
    }

    /**
     * Constructs a BadRequestException with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause   the cause of the exception
     */
    public BadRequestException(String message, Throwable cause) {
        super(message, cause, HttpStatus.BAD_REQUEST, DEFAULT_ERROR_CODE);
    }
}
