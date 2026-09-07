package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Project;
import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportReview;
import com.sisenco.weeklyreport.domain.ReportStatus;
import com.sisenco.weeklyreport.domain.ReportVersion;
import com.sisenco.weeklyreport.domain.ReviewAction;
import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.TaskType;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.domain.VersionAchievement;
import com.sisenco.weeklyreport.domain.VersionBlocker;
import com.sisenco.weeklyreport.domain.VersionHours;
import com.sisenco.weeklyreport.domain.VersionTask;
import com.sisenco.weeklyreport.dto.request.ReviewReportRequest;
import com.sisenco.weeklyreport.dto.request.SaveReportRequest;
import com.sisenco.weeklyreport.dto.response.PageResponse;
import com.sisenco.weeklyreport.dto.response.ReportDetailResponse;
import com.sisenco.weeklyreport.dto.response.ReportSummaryResponse;
import com.sisenco.weeklyreport.dto.response.ReportVersionResponse;
import com.sisenco.weeklyreport.exception.BadRequestException;
import com.sisenco.weeklyreport.exception.ConflictException;
import com.sisenco.weeklyreport.exception.ForbiddenException;
import com.sisenco.weeklyreport.exception.NotFoundException;
import com.sisenco.weeklyreport.repository.ProjectRepository;
import com.sisenco.weeklyreport.repository.ReportRepository;
import com.sisenco.weeklyreport.repository.ReportReviewRepository;
import com.sisenco.weeklyreport.repository.ReportSpecifications;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.ReportService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final ReportReviewRepository reviewRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    // ---------------------------------------------------------------- member

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReportSummaryResponse> listOwn(
            Long userId, ReportStatus status, Long projectId, LocalDate from, LocalDate to, Pageable pageable) {

        var spec = ReportSpecifications.combine(
                ReportSpecifications.ownedBy(userId),
                ReportSpecifications.hasStatus(status),
                ReportSpecifications.hasProject(projectId),
                ReportSpecifications.weekStartFrom(from),
                ReportSpecifications.weekStartTo(to));

        return PageResponse.from(reportRepository.findAll(spec, pageable), ReportSummaryResponse::from);
    }

    @Override
    @Transactional
    public ReportDetailResponse createDraft(Long userId, SaveReportRequest request) {
        LocalDate weekStart = requireMonday(request.weekStart());

        if (reportRepository.existsByUserIdAndWeekStart(userId, weekStart)) {
            throw new ConflictException(
                    "You already have a report for the week of " + weekStart + ". Edit that one instead.");
        }

        User owner = userRepository.findById(userId).orElseThrow(() -> NotFoundException.of("User", userId));

        // Second layer, behind the controller's role check. Filing is a member
        // capability: managers review reports rather than writing them, and the
        // dashboard's compliance figures count members only, so a manager's
        // report would sit outside every metric that measures the team.
        if (owner.getRole() != Role.MEMBER) {
            throw new ForbiddenException("Managers review reports rather than filing them");
        }

        Report report = Report.builder()
                .user(owner)
                .project(resolveProject(request.projectId(), owner, null))
                .weekStart(weekStart)
                .weekEnd(weekStart.plusDays(6))
                .status(ReportStatus.DRAFT)
                .build();

        // Version 1 is created with the report, so there is always exactly one
        // editable snapshot from the moment a report exists.
        ReportVersion version = ReportVersion.builder()
                .report(report)
                .versionNo(1)
                .editable(true)
                .build();
        report.getVersions().add(version);
        report.setCurrentVersion(version);

        applyContent(version, request);

        return ReportDetailResponse.from(reportRepository.save(report), true);
    }

    @Override
    @Transactional
    public ReportDetailResponse update(Long reportId, Long userId, SaveReportRequest request) {
        Report report = findReport(reportId);

        if (!report.isOwnedBy(userId)) {
            // Deliberately the same message a manager would get: the owner check
            // is the point, and naming the real owner would leak who they are.
            throw new ForbiddenException("You can only edit your own reports");
        }
        if (!report.getStatus().isEditableByOwner()) {
            throw new ConflictException(
                    "A report that is %s cannot be edited".formatted(report.getStatus().name().toLowerCase()));
        }

        ReportVersion version = report.editableVersion()
                .orElseThrow(() -> new ConflictException("This report has no editable version"));

        // The week itself is fixed once the report exists: moving it would
        // collide with the one-report-per-week rule and rewrite history.
        if (!report.getWeekStart().equals(request.weekStart())) {
            throw new BadRequestException("The week of a report cannot be changed once it has been created");
        }

        report.setProject(resolveProject(request.projectId(), report.getUser(), report));
        applyContent(version, request);

        return ReportDetailResponse.from(reportRepository.save(report), true);
    }

    @Override
    @Transactional
    public ReportDetailResponse submit(Long reportId, Long userId) {
        Report report = findReport(reportId);

        if (!report.isOwnedBy(userId)) {
            throw new ForbiddenException("You can only submit your own reports");
        }
        if (!report.getStatus().isEditableByOwner()) {
            throw new ConflictException(
                    "This report is already %s".formatted(report.getStatus().name().toLowerCase()));
        }

        ReportVersion version = report.editableVersion()
                .orElseThrow(() -> new ConflictException("This report has no editable version"));

        if (version.getTasks().isEmpty()) {
            throw new BadRequestException("Add at least one completed task before submitting");
        }

        Instant now = Instant.now();

        // Freeze the snapshot. From here it is a permanent record of what was
        // reviewed, and nothing may modify it again.
        version.setEditable(false);
        version.setSubmittedAt(now);

        report.setStatus(ReportStatus.SUBMITTED);
        report.setSubmittedAt(now);

        return ReportDetailResponse.from(reportRepository.save(report), false);
    }

    // --------------------------------------------------------------- manager

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ReportSummaryResponse> listTeam(
            Long userId,
            ReportStatus status,
            Long projectId,
            LocalDate weekStart,
            LocalDate from,
            LocalDate to,
            Pageable pageable) {

        var spec = ReportSpecifications.combine(
                // Applied unconditionally: a draft belongs to its author alone,
                // so no filter combination can surface someone else's.
                ReportSpecifications.visibleToManager(),
                ReportSpecifications.ownedBy(userId),
                ReportSpecifications.hasStatus(status),
                ReportSpecifications.hasProject(projectId),
                ReportSpecifications.inWeek(weekStart),
                ReportSpecifications.weekStartFrom(from),
                ReportSpecifications.weekStartTo(to));

        return PageResponse.from(reportRepository.findAll(spec, pageable), ReportSummaryResponse::from);
    }

    @Override
    @Transactional
    public ReportDetailResponse review(Long reportId, Long managerId, ReviewReportRequest request) {
        Report report = findReport(reportId);

        if (!report.getStatus().isAwaitingReview()) {
            throw new ConflictException(
                    "Only a submitted report can be reviewed; this one is %s"
                            .formatted(report.getStatus().name().toLowerCase()));
        }
        if (report.isOwnedBy(managerId)) {
            throw new ConflictException("You cannot review your own report");
        }

        User reviewer =
                userRepository.findById(managerId).orElseThrow(() -> NotFoundException.of("User", managerId));
        ReportVersion reviewed = Objects.requireNonNull(
                report.getCurrentVersion(), "A submitted report always has a current version");
        Instant now = Instant.now();

        String comment = request.comment() == null ? null : request.comment().trim();
        if (request.action() == ReviewAction.REQUEST_CHANGES && (comment == null || comment.isBlank())) {
            throw new BadRequestException("Explain what needs correcting before sending the report back");
        }

        // Pinned to the version actually reviewed, so a comment stays attached to
        // the text it was written about even after the member revises it.
        ReportReview review = ReportReview.builder()
                .report(report)
                .version(reviewed)
                .reviewer(reviewer)
                .action(request.action())
                .comment(comment)
                .build();
        report.getReviews().add(review);
        reviewRepository.save(review);

        report.setReviewedAt(now);

        if (request.action() == ReviewAction.APPROVE) {
            report.setStatus(ReportStatus.APPROVED);
        } else {
            report.setStatus(ReportStatus.NEEDS_CORRECTION);
            report.setCurrentVersion(openNextVersion(report, reviewed));
        }

        return ReportDetailResponse.from(reportRepository.save(report), false);
    }

    // ---------------------------------------------------------------- shared

    @Override
    @Transactional(readOnly = true)
    public ReportDetailResponse get(Long reportId, AppUserPrincipal caller) {
        Report report = findReport(reportId);
        requireVisibleTo(report, caller);
        return ReportDetailResponse.from(report, isEditableBy(report, caller));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportVersionResponse> versions(Long reportId, AppUserPrincipal caller) {
        Report report = findReport(reportId);
        requireVisibleTo(report, caller);
        return report.getVersions().stream()
                .sorted(java.util.Comparator.comparingInt(ReportVersion::getVersionNo))
                .map(ReportVersionResponse::from)
                .toList();
    }

    // --------------------------------------------------------------- helpers

    /**
     * Copies a frozen snapshot into the next version number and marks the copy
     * editable. This is what makes a correction cycle non-destructive: the member
     * carries on from what they wrote, and the version the manager commented on
     * survives untouched.
     */
    private ReportVersion openNextVersion(Report report, ReportVersion source) {
        ReportVersion next = ReportVersion.builder()
                .report(report)
                .versionNo(report.nextVersionNo())
                .editable(true)
                .nextWeekPlan(source.getNextWeekPlan())
                .notes(source.getNotes())
                .links(source.getLinks())
                .build();

        source.getTasks()
                .forEach(t -> next.getTasks()
                        .add(VersionTask.builder()
                                .version(next)
                                .name(t.getName())
                                .priority(t.getPriority())
                                .plannedPct(t.getPlannedPct())
                                .actualPct(t.getActualPct())
                                .status(t.getStatus())
                                .hoursPlanned(t.getHoursPlanned())
                                .hoursSpent(t.getHoursSpent())
                                .deliverable(t.getDeliverable())
                                .sortOrder(t.getSortOrder())
                                .build()));

        source.getBlockers()
                .forEach(b -> next.getBlockers()
                        .add(VersionBlocker.builder()
                                .version(next)
                                .description(b.getDescription())
                                .key(b.isKey())
                                .resolved(b.isResolved())
                                .sortOrder(b.getSortOrder())
                                .build()));

        source.getAchievements()
                .forEach(a -> next.getAchievements()
                        .add(VersionAchievement.builder()
                                .version(next)
                                .description(a.getDescription())
                                .key(a.isKey())
                                .sortOrder(a.getSortOrder())
                                .build()));

        source.getHours()
                .forEach(h -> next.getHours()
                        .add(VersionHours.builder()
                                .version(next)
                                .taskType(h.getTaskType())
                                .hours(h.getHours())
                                .build()));

        report.getVersions().add(next);
        return next;
    }

    /**
     * Replaces a version's content wholesale.
     *
     * <p>Children are cleared and rebuilt rather than diffed. With
     * {@code orphanRemoval} that is a delete-then-insert, which is fine at this
     * scale and removes a whole class of "which row did the user mean" bugs that
     * a diff-by-index would introduce.
     */
    private void applyContent(ReportVersion version, SaveReportRequest request) {
        version.setNextWeekPlan(request.nextWeekPlan());
        version.setNotes(request.notes());
        version.setLinks(request.links());

        version.getTasks().clear();
        int order = 0;
        for (var task : nullSafe(request.tasks())) {
            version.getTasks()
                    .add(VersionTask.builder()
                            .version(version)
                            .name(task.name().trim())
                            .priority(task.priority())
                            .plannedPct(task.plannedPct())
                            .actualPct(task.actualPct())
                            .status(task.status())
                            .hoursPlanned(task.hoursPlanned())
                            .hoursSpent(task.hoursSpent())
                            .deliverable(task.deliverable())
                            .sortOrder(order++)
                            .build());
        }

        version.getBlockers().clear();
        order = 0;
        boolean keyBlockerSeen = false;
        for (var blocker : nullSafe(request.blockers())) {
            if (blocker.key()) {
                if (keyBlockerSeen) {
                    throw new BadRequestException("Only one blocker can be flagged as the key issue of the week");
                }
                keyBlockerSeen = true;
            }
            version.getBlockers()
                    .add(VersionBlocker.builder()
                            .version(version)
                            .description(blocker.description().trim())
                            .key(blocker.key())
                            .resolved(blocker.resolved())
                            .sortOrder(order++)
                            .build());
        }

        version.getAchievements().clear();
        order = 0;
        boolean keyAchievementSeen = false;
        for (var achievement : nullSafe(request.achievements())) {
            if (achievement.key()) {
                if (keyAchievementSeen) {
                    throw new BadRequestException(
                            "Only one achievement can be flagged as the key achievement of the week");
                }
                keyAchievementSeen = true;
            }
            version.getAchievements()
                    .add(VersionAchievement.builder()
                            .version(version)
                            .description(achievement.description().trim())
                            .key(achievement.key())
                            .sortOrder(order++)
                            .build());
        }

        applyHours(version, request);
    }

    /**
     * Merges the hours breakdown in place rather than clearing and rebuilding it.
     *
     * <p>{@code version_hours} is unique on (version_id, task_type). Within a
     * single flush Hibernate emits inserts before deletes, so clear-then-add
     * would try to insert DEVELOPMENT while the old DEVELOPMENT row is still
     * present and trip that constraint. Updating the rows that survive, deleting
     * only those that are really gone, and inserting only what is really new
     * sidesteps the ordering problem entirely — and emits fewer statements.
     */
    private void applyHours(ReportVersion version, SaveReportRequest request) {
        Map<TaskType, BigDecimal> requested = new EnumMap<>(TaskType.class);
        for (var hours : nullSafe(request.hours())) {
            if (requested.putIfAbsent(hours.taskType(), hours.hours()) != null) {
                throw new BadRequestException("Hours for %s were given twice".formatted(hours.taskType()));
            }
        }

        version.getHours().removeIf(existing -> !requested.containsKey(existing.getTaskType()));
        for (VersionHours existing : version.getHours()) {
            existing.setHours(requested.remove(existing.getTaskType()));
        }
        requested.forEach((taskType, value) -> version.getHours()
                .add(VersionHours.builder()
                        .version(version)
                        .taskType(taskType)
                        .hours(value)
                        .build()));
    }

    private Report findReport(Long reportId) {
        return reportRepository.findById(reportId).orElseThrow(() -> NotFoundException.of("Report", reportId));
    }

    /**
     * A report is visible to its owner always, and to a manager once it has left
     * DRAFT. Managers deliberately cannot read someone else's unfinished draft.
     */
    private void requireVisibleTo(Report report, AppUserPrincipal caller) {
        if (report.isOwnedBy(caller.getId())) {
            return;
        }
        boolean managerViewingSubmitted =
                caller.canReviewReports() && report.getStatus() != ReportStatus.DRAFT;
        if (!managerViewingSubmitted) {
            // 404 rather than 403 for a foreign report the caller may not know
            // exists: a 403 would confirm the id is real.
            throw NotFoundException.of("Report", report.getId());
        }
    }

    /** Only the owner may edit, and only while the workflow allows it. */
    private boolean isEditableBy(Report report, AppUserPrincipal caller) {
        return report.isOwnedBy(caller.getId()) && report.getStatus().isEditableByOwner();
    }

    /**
     * Resolves the project a report is tagged against, and checks the author may
     * use it.
     *
     * <p>The picker only offers projects a member is assigned to, but the API
     * has to hold the same line — the list a client renders is not a constraint
     * on what it can post.
     *
     * @param existing the report being edited, or null when creating. A project
     *     already on a report stays selectable even if the author has since been
     *     unassigned from it, so an unrelated edit cannot be blocked by a
     *     membership change made after the fact.
     */
    private Project resolveProject(Long projectId, User author, Report existing) {
        if (projectId == null) {
            return null;
        }
        Project project = projectRepository
                .findById(projectId)
                .orElseThrow(() -> NotFoundException.of("Project", projectId));

        boolean alreadyOnThisReport = existing != null
                && existing.getProject() != null
                && existing.getProject().getId().equals(projectId);

        if (author.getRole() == Role.MEMBER && !alreadyOnThisReport && !project.isAvailableTo(author.getId())) {
            throw new ForbiddenException("You are not assigned to that project");
        }
        return project;
    }

    private LocalDate requireMonday(LocalDate weekStart) {
        if (weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new BadRequestException(
                    "Week start must be a Monday. %s is a %s."
                            .formatted(weekStart, weekStart.getDayOfWeek().name().toLowerCase()));
        }
        return weekStart;
    }

    private static <T> List<T> nullSafe(List<T> values) {
        return values == null ? List.of() : values;
    }
}
