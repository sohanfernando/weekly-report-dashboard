package com.sisenco.weeklyreport.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base for expected, client-visible failures. Services throw these; the
 * {@link com.sisenco.weeklyreport.web.GlobalExceptionHandler} turns them into
 * RFC 9457 problem responses so controllers stay free of error plumbing.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}
