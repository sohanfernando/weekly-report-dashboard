package com.sisenco.weeklyreport.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a request is well-formed but conflicts with current state — a
 * duplicate email, a second report for the same week, or a workflow transition
 * that is not legal from the report's current status.
 */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(HttpStatus.CONFLICT, message);
    }
}
