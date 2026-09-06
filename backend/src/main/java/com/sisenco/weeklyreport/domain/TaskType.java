package com.sisenco.weeklyreport.domain;

/**
 * Buckets for the optional "hours worked by task type" breakdown.
 * Drives the team-wide time-distribution chart on the manager dashboard.
 */
public enum TaskType {
    DEVELOPMENT,
    TESTING,
    MEETINGS,
    DOCUMENTATION,
    OTHER
}
