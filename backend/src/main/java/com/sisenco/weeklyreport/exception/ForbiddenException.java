package com.sisenco.weeklyreport.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when the caller is authenticated but not allowed to touch this
 * particular row — the ownership half of the access rules.
 */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(HttpStatus.FORBIDDEN, message);
    }
}
