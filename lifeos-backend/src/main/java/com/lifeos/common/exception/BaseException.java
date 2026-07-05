package com.lifeos.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base abstract exception class for all custom runtime business exceptions in the LifeOS application.
 */
public abstract class BaseException extends RuntimeException {

    private final HttpStatus httpStatus;
    private final String errorCode;

    /**
     * Constructs a new BaseException with message, HTTP status, and business error code.
     *
     * @param message    the detail message
     * @param httpStatus the HTTP status to map this exception to
     * @param errorCode  the business error code
     */
    protected BaseException(String message, HttpStatus httpStatus, String errorCode) {
        super(message);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    /**
     * Constructs a new BaseException with message, cause, HTTP status, and business error code.
     *
     * @param message    the detail message
     * @param cause      the cause of the exception
     * @param httpStatus the HTTP status to map this exception to
     * @param errorCode  the business error code
     */
    protected BaseException(String message, Throwable cause, HttpStatus httpStatus, String errorCode) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
