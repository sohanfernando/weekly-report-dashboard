-- =====================================================================
-- V1 : Weekly Report Generator & Team Dashboard - initial schema
--
-- Versioning model
-- ----------------
-- reports         = the container for one (user, week). Holds status only.
-- report_versions = immutable content snapshots of that report.
-- Content children (tasks / blockers / achievements / hours) hang off a
-- VERSION, never off the report, so a correction cycle never overwrites
-- what the manager previously reviewed.
--
-- Enum-like columns are VARCHAR + CHECK rather than native MySQL ENUM:
-- portable, works cleanly with JPA @Enumerated(STRING), and adding a value
-- later is a normal migration instead of an ALTER on a column type.
-- =====================================================================

-- ---------------------------------------------------------------- users
CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(180) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL,
    job_title     VARCHAR(120) NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('MEMBER', 'MANAGER', 'ADMIN'))
) ENGINE = InnoDB;

-- ------------------------------------------------------------- projects
CREATE TABLE projects (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    code        VARCHAR(30)  NOT NULL,
    description VARCHAR(500) NULL,
    color       VARCHAR(9)   NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_projects_code UNIQUE (code)
) ENGINE = InnoDB;

-- Optional per the brief: assign team members to relevant projects.
CREATE TABLE project_members (
    project_id BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,
    PRIMARY KEY (project_id, user_id),
    CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_pm_user    FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------- reports
CREATE TABLE reports (
    id                 BIGINT      NOT NULL AUTO_INCREMENT,
    user_id            BIGINT      NOT NULL,
    project_id         BIGINT      NULL,
    week_start         DATE        NOT NULL,
    week_end           DATE        NOT NULL,
    status             VARCHAR(20) NOT NULL,
    current_version_id BIGINT      NULL,
    submitted_at       DATETIME(6) NULL,
    reviewed_at        DATETIME(6) NULL,
    created_at         DATETIME(6) NOT NULL,
    updated_at         DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    -- One report per person per week: makes "not yet started" computable as
    -- the absence of a row, and blocks accidental duplicates.
    CONSTRAINT uk_reports_user_week UNIQUE (user_id, week_start),
    CONSTRAINT fk_reports_user    FOREIGN KEY (user_id)    REFERENCES users (id),
    CONSTRAINT fk_reports_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT ck_reports_status CHECK (status IN ('DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION', 'APPROVED'))
) ENGINE = InnoDB;

CREATE INDEX ix_reports_week_status ON reports (week_start, status);
CREATE INDEX ix_reports_project     ON reports (project_id);

-- ------------------------------------------------------- report_versions
CREATE TABLE report_versions (
    id             BIGINT      NOT NULL AUTO_INCREMENT,
    report_id      BIGINT      NOT NULL,
    version_no     INT         NOT NULL,
    -- Exactly one version per report is editable: the working draft.
    -- Submitting freezes it; requesting changes clones it into version_no + 1.
    editable       BOOLEAN     NOT NULL DEFAULT TRUE,
    submitted_at   DATETIME(6) NULL,
    next_week_plan TEXT        NULL,
    notes          TEXT        NULL,
    links          TEXT        NULL,
    created_at     DATETIME(6) NOT NULL,
    updated_at     DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_versions_report_no UNIQUE (report_id, version_no),
    CONSTRAINT fk_versions_report FOREIGN KEY (report_id) REFERENCES reports (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- Added after the fact: reports and report_versions reference each other.
ALTER TABLE reports
    ADD CONSTRAINT fk_reports_current_version
        FOREIGN KEY (current_version_id) REFERENCES report_versions (id);

-- --------------------------------------------------------- version_tasks
CREATE TABLE version_tasks (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    version_id    BIGINT        NOT NULL,
    name          VARCHAR(255)  NOT NULL,
    priority      VARCHAR(20)   NOT NULL,
    planned_pct   INT           NOT NULL DEFAULT 0,
    actual_pct    INT           NOT NULL DEFAULT 0,
    status        VARCHAR(20)   NOT NULL,
    hours_planned DECIMAL(5, 2) NOT NULL DEFAULT 0,
    hours_spent   DECIMAL(5, 2) NOT NULL DEFAULT 0,
    deliverable   VARCHAR(500)  NULL,
    sort_order    INT           NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_tasks_version FOREIGN KEY (version_id) REFERENCES report_versions (id) ON DELETE CASCADE,
    CONSTRAINT ck_tasks_priority    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT ck_tasks_status      CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
    CONSTRAINT ck_tasks_planned_pct CHECK (planned_pct BETWEEN 0 AND 100),
    CONSTRAINT ck_tasks_actual_pct  CHECK (actual_pct BETWEEN 0 AND 100)
) ENGINE = InnoDB;

CREATE INDEX ix_tasks_version ON version_tasks (version_id);

-- ------------------------------------------------------ version_blockers
CREATE TABLE version_blockers (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    version_id  BIGINT        NOT NULL,
    description VARCHAR(1000) NOT NULL,
    is_key      BOOLEAN       NOT NULL DEFAULT FALSE,
    resolved    BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_blockers_version FOREIGN KEY (version_id) REFERENCES report_versions (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_blockers_version ON version_blockers (version_id);

-- -------------------------------------------------- version_achievements
CREATE TABLE version_achievements (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    version_id  BIGINT        NOT NULL,
    description VARCHAR(1000) NOT NULL,
    is_key      BOOLEAN       NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_achievements_version FOREIGN KEY (version_id) REFERENCES report_versions (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE INDEX ix_achievements_version ON version_achievements (version_id);

-- --------------------------------------------------------- version_hours
-- Optional per the brief; powers the "time spent by task type" chart.
CREATE TABLE version_hours (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    version_id BIGINT        NOT NULL,
    task_type  VARCHAR(30)   NOT NULL,
    hours      DECIMAL(5, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uk_hours_version_type UNIQUE (version_id, task_type),
    CONSTRAINT fk_hours_version FOREIGN KEY (version_id) REFERENCES report_versions (id) ON DELETE CASCADE,
    CONSTRAINT ck_hours_task_type CHECK (task_type IN ('DEVELOPMENT', 'TESTING', 'MEETINGS', 'DOCUMENTATION', 'OTHER'))
) ENGINE = InnoDB;

-- -------------------------------------------------------- report_reviews
-- Full audit trail of every review action. version_id records exactly which
-- snapshot a comment was written against, and the table doubles as the
-- dashboard activity feed.
CREATE TABLE report_reviews (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    report_id   BIGINT        NOT NULL,
    version_id  BIGINT        NOT NULL,
    reviewer_id BIGINT        NOT NULL,
    action      VARCHAR(20)   NOT NULL,
    comment     VARCHAR(2000) NULL,
    created_at  DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reviews_report   FOREIGN KEY (report_id)   REFERENCES reports (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_version  FOREIGN KEY (version_id)  REFERENCES report_versions (id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id),
    CONSTRAINT ck_reviews_action CHECK (action IN ('APPROVE', 'REQUEST_CHANGES'))
) ENGINE = InnoDB;

CREATE INDEX ix_reviews_report  ON report_reviews (report_id, created_at);
CREATE INDEX ix_reviews_created ON report_reviews (created_at);
