package com.sisenco.weeklyreport.exception;

import org.springframework.http.HttpStatus;

/**
 * A dependency this application does not control is unavailable — currently only
 * the chat provider.
 *
 * <p>Kept distinct from a 500 on purpose: the request was valid and the fault is
 * not in this application, so the client is told to retry rather than shown an
 * error that reads like a bug here.
 */
public class ServiceUnavailableException extends ApiException {

    public ServiceUnavailableException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
