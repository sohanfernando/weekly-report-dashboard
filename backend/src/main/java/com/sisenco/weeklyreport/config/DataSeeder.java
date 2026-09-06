package com.sisenco.weeklyreport.config;

import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.ReviewAction;
import com.sisenco.weeklyreport.domain.TaskPriority;
import com.sisenco.weeklyreport.domain.TaskStatus;
import com.sisenco.weeklyreport.domain.TaskType;
import com.sisenco.weeklyreport.dto.request.AchievementRequest;
import com.sisenco.weeklyreport.dto.request.BlockerRequest;
import com.sisenco.weeklyreport.dto.request.CreateProjectRequest;
import com.sisenco.weeklyreport.dto.request.CreateUserRequest;
import com.sisenco.weeklyreport.dto.request.HoursRequest;
import com.sisenco.weeklyreport.dto.request.ReviewReportRequest;
import com.sisenco.weeklyreport.dto.request.SaveReportRequest;
import com.sisenco.weeklyreport.dto.request.TaskRequest;
import com.sisenco.weeklyreport.dto.response.ProjectResponse;
import com.sisenco.weeklyreport.dto.response.UserResponse;
import com.sisenco.weeklyreport.repository.ReportRepository;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.service.ProjectService;
import com.sisenco.weeklyreport.service.ReportService;
import com.sisenco.weeklyreport.service.UserService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Populates a demo dataset: a manager plus five members, five projects and six
 * weeks of reports in a spread of statuses, so the dashboard has something
 * meaningful to show on a fresh checkout.
 *
 * <p>Reports are created by calling the real services rather than by inserting
 * rows. Seeded history therefore goes through the same validation and the same
 * version-cloning logic as anything a user does, which means the demo data can
 * never drift into a state the application itself would not produce.
 *
 * <p>Runs after {@link BootstrapManagerInitializer} and only when the database
 * holds no reports at all, so restarting never duplicates anything.
 */
@Component
@Order(20)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements ApplicationRunner {

    private static final String DEMO_PASSWORD = "password123";

    private final AppProperties properties;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final UserService userService;
    private final ProjectService projectService;
    private final ReportService reportService;

    /** Fixed seed: the same demo dataset every time, which keeps screenshots stable. */
    private final Random random = new Random(20260906L);

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.seed().enabled()) {
            return;
        }
        if (reportRepository.count() > 0) {
            log.debug("Reports already present; skipping demo seed");
            return;
        }

        log.info("Seeding demo dataset");

        Long managerId = userRepository
                .findByRoleAndActiveTrueOrderByNameAsc(Role.MANAGER)
                .stream()
                .findFirst()
                .map(user -> user.getId())
                .orElse(null);
        if (managerId == null) {
            log.warn("No manager found; skipping demo seed");
            return;
        }

        List<ProjectResponse> projects = seedProjects();
        List<UserResponse> members = seedMembers();
        if (members.isEmpty() || projects.isEmpty()) {
            return;
        }

        seedReports(members, projects, managerId);

        log.info(
                "Demo seed complete: {} members, {} projects, {} reports",
                members.size(),
                projects.size(),
                reportRepository.count());
    }

    // -------------------------------------------------------------- projects

    private List<ProjectResponse> seedProjects() {
        record Seed(String name, String code, String description, String color) {}
        List<Seed> seeds = List.of(
                new Seed("Client A Portal", "CLIENT-A", "Customer-facing portal for Client A", "#4F46E5"),
                new Seed("Internal Tooling", "INTERNAL", "Tools the team builds for itself", "#0EA5E9"),
                new Seed("R&D", "RND", "Exploratory and proof-of-concept work", "#10B981"),
                new Seed("Marketing Site", "MARKETING", "Public website and campaign pages", "#F59E0B"),
                new Seed("Support & Maintenance", "SUPPORT", "Bug fixes and production support", "#EF4444"));

        List<ProjectResponse> created = new ArrayList<>();
        for (Seed seed : seeds) {
            try {
                created.add(projectService.create(
                        new CreateProjectRequest(seed.name(), seed.code(), seed.description(), seed.color())));
            } catch (RuntimeException ex) {
                log.debug("Project {} already exists", seed.code());
            }
        }
        return created;
    }

    // --------------------------------------------------------------- members

    private List<UserResponse> seedMembers() {
        record Seed(String name, String email, String jobTitle) {}
        List<Seed> seeds = List.of(
                new Seed("Ravi Silva", "ravi@sisenco.local", "Backend Developer"),
                new Seed("Thara Fernando", "thara@sisenco.local", "QA Engineer"),
                new Seed("Dinuka Perera", "dinuka@sisenco.local", "Frontend Developer"),
                new Seed("Amaya Jayasuriya", "amaya@sisenco.local", "UI/UX Designer"),
                new Seed("Kasun Bandara", "kasun@sisenco.local", "DevOps Engineer"));

        List<UserResponse> created = new ArrayList<>();
        for (Seed seed : seeds) {
            try {
                created.add(userService.create(new CreateUserRequest(
                        seed.name(), seed.email(), DEMO_PASSWORD, Role.MEMBER, seed.jobTitle())));
            } catch (RuntimeException ex) {
                log.debug("Member {} already exists", seed.email());
            }
        }
        return created;
    }

    // --------------------------------------------------------------- reports

    /**
     * Six weeks ending with the current one.
     *
     * <p>Older weeks are settled and approved. The middle weeks carry a
     * correction cycle each, so version history is visible without anyone having
     * to create it by hand. The current week is deliberately half-finished —
     * some drafts, some submissions, and two members who have not started at all
     * — because that is what makes the compliance metrics on the dashboard show
     * anything other than 100%.
     */
    private void seedReports(List<UserResponse> members, List<ProjectResponse> projects, Long managerId) {
        LocalDate currentMonday = LocalDate.now().with(DayOfWeek.MONDAY);

        for (int weekOffset = 5; weekOffset >= 0; weekOffset--) {
            LocalDate week = currentMonday.minusWeeks(weekOffset);
            boolean isCurrentWeek = weekOffset == 0;

            for (int m = 0; m < members.size(); m++) {
                UserResponse member = members.get(m);
                ProjectResponse project = projects.get((m + weekOffset) % projects.size());

                // Two members have not started the current week yet, which is what
                // gives "not yet started" something to report.
                if (isCurrentWeek && m >= members.size() - 2) {
                    continue;
                }

                Long reportId = createReport(member.id(), project.id(), week, m, weekOffset);
                if (reportId == null) {
                    continue;
                }

                advanceWorkflow(reportId, member, project, week, m, weekOffset, managerId, isCurrentWeek);
            }
        }
    }

    private Long createReport(Long memberId, Long projectId, LocalDate week, int memberIndex, int weekOffset) {
        try {
            return reportService
                    .createDraft(memberId, buildReport(week, projectId, memberIndex, weekOffset, false))
                    .id();
        } catch (RuntimeException ex) {
            log.debug("Could not seed report for member {} week {}: {}", memberIndex, week, ex.getMessage());
            return null;
        }
    }

    private void advanceWorkflow(
            Long reportId,
            UserResponse member,
            ProjectResponse project,
            LocalDate week,
            int memberIndex,
            int weekOffset,
            Long managerId,
            boolean isCurrentWeek) {

        if (isCurrentWeek) {
            // Member 0 has submitted and is waiting; member 1 is still drafting;
            // member 2 has been sent back and is fixing it.
            if (memberIndex == 0) {
                reportService.submit(reportId, member.id());
            } else if (memberIndex == 2) {
                reportService.submit(reportId, member.id());
                reportService.review(
                        reportId,
                        managerId,
                        new ReviewReportRequest(
                                ReviewAction.REQUEST_CHANGES,
                                "Please split the migration task and record the hours you actually spent on the "
                                        + "incident on Thursday."));
            }
            return;
        }

        reportService.submit(reportId, member.id());

        // One report per older week goes through a full correction cycle, so the
        // version history and the comment trail are populated for the demo.
        boolean correctionCycle = memberIndex == (weekOffset % 3);
        if (correctionCycle) {
            reportService.review(
                    reportId,
                    managerId,
                    new ReviewReportRequest(
                            ReviewAction.REQUEST_CHANGES,
                            "Good detail overall, but the planned versus actual percentages do not line up with "
                                    + "the hours logged. Please reconcile them and resubmit."));
            reportService.update(reportId, member.id(), buildReport(week, project.id(), memberIndex, weekOffset, true));
            reportService.submit(reportId, member.id());
        }

        // The most recent completed week is left awaiting review for one member,
        // so the review queue is not empty when a manager first logs in.
        boolean leaveForReview = weekOffset == 1 && memberIndex == 1;
        if (!leaveForReview) {
            reportService.review(
                    reportId,
                    managerId,
                    new ReviewReportRequest(ReviewAction.APPROVE, approvalComment(memberIndex)));
        }
    }

    private String approvalComment(int memberIndex) {
        List<String> comments = List.of(
                "Clear and complete, thanks.",
                "Nice work getting the regression suite green.",
                "Good progress. Let us talk about the design dependency in standup.",
                "Approved. The before/after numbers are a great touch.",
                "All good. Keep flagging the pipeline flakiness.");
        return comments.get(memberIndex % comments.size());
    }

    // ---------------------------------------------------------- content data

    private SaveReportRequest buildReport(
            LocalDate week, Long projectId, int memberIndex, int weekOffset, boolean corrected) {

        List<TaskRequest> tasks = buildTasks(memberIndex, weekOffset, corrected);

        BigDecimal spent = tasks.stream()
                .map(TaskRequest::hoursSpent)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Split the logged hours across task types, weighted by discipline, so the
        // team-wide time chart has a realistic shape rather than a flat one.
        BigDecimal development = percentOf(spent, memberIndex == 1 ? 25 : 55);
        BigDecimal testing = percentOf(spent, memberIndex == 1 ? 45 : 15);
        BigDecimal meetings = percentOf(spent, 20);
        BigDecimal documentation = spent.subtract(development).subtract(testing).subtract(meetings).max(BigDecimal.ZERO);

        return new SaveReportRequest(
                week,
                projectId,
                tasks,
                nextWeekPlan(memberIndex),
                buildBlockers(memberIndex, weekOffset, corrected),
                buildAchievements(memberIndex, weekOffset),
                List.of(
                        new HoursRequest(TaskType.DEVELOPMENT, development),
                        new HoursRequest(TaskType.TESTING, testing),
                        new HoursRequest(TaskType.MEETINGS, meetings),
                        new HoursRequest(TaskType.DOCUMENTATION, documentation)),
                corrected ? "Reconciled the percentages against the hours as requested." : notes(memberIndex),
                "https://github.com/sisenco/weekly-report/pull/" + (100 + weekOffset * 5 + memberIndex));
    }

    private List<TaskRequest> buildTasks(int memberIndex, int weekOffset, boolean corrected) {
        List<List<String>> byRole = List.of(
                List.of("Payment reconciliation endpoint", "Refactor invoice service", "Fix N+1 on order history"),
                List.of("Regression suite for checkout", "Automate smoke tests in CI", "Triage production defects"),
                List.of("Rebuild dashboard filters", "Accessibility pass on forms", "Skeleton loading states"),
                List.of("Design tokens for dark mode", "Empty-state illustrations", "Usability review of onboarding"),
                List.of("Blue/green deploy pipeline", "Cut container image size", "Alerting for queue depth"));

        List<String> names = byRole.get(memberIndex % byRole.size());
        int count = corrected ? 3 : 2 + random.nextInt(2);

        List<TaskRequest> tasks = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            String name = names.get(i % names.size());
            boolean done = weekOffset > 1 || i < count - 1;
            int actual = done ? 100 : 55 + random.nextInt(35);
            BigDecimal planned = BigDecimal.valueOf(4 + random.nextInt(8));
            BigDecimal spent = planned.add(BigDecimal.valueOf(random.nextInt(5) - 2)).max(BigDecimal.ONE);

            tasks.add(new TaskRequest(
                    name,
                    i == 0 ? TaskPriority.HIGH : (i == 1 ? TaskPriority.MEDIUM : TaskPriority.LOW),
                    100,
                    actual,
                    done ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
                    planned,
                    spent,
                    "PR #" + (200 + weekOffset * 7 + memberIndex * 3 + i)));
        }
        return tasks;
    }

    private List<BlockerRequest> buildBlockers(int memberIndex, int weekOffset, boolean corrected) {
        if (weekOffset > 3 && memberIndex % 2 == 0) {
            return List.of();
        }
        List<String> pool = List.of(
                "Waiting on the payment provider sandbox credentials",
                "CI runners are flaky and rerunning the suite costs an hour a day",
                "Design tokens for dark mode are still under review",
                "Staging database keeps drifting from production",
                "Blocked on access to the analytics warehouse");

        // Older weeks are settled, so their blockers are resolved; recent ones are
        // still open, which is what the open-blockers metric counts.
        boolean resolved = weekOffset >= 3 || corrected;
        return List.of(new BlockerRequest(pool.get((memberIndex + weekOffset) % pool.size()), true, resolved));
    }

    private List<AchievementRequest> buildAchievements(int memberIndex, int weekOffset) {
        List<String> pool = List.of(
                "Cut the invoice export from 40s to under 4s",
                "Regression suite is green three runs in a row",
                "Shipped the new filters ahead of schedule",
                "Onboarding drop-off improved after the copy rewrite",
                "Container image is 60% smaller after the multi-stage build");
        return List.of(new AchievementRequest(pool.get((memberIndex + weekOffset) % pool.size()), true));
    }

    private String nextWeekPlan(int memberIndex) {
        List<String> plans = List.of(
                "Finish the reconciliation endpoint and start on refunds.",
                "Extend the regression suite to the refunds flow.",
                "Wire the dashboard filters to the new endpoints.",
                "Prototype the dark mode palette and review with the team.",
                "Roll the blue/green pipeline out to staging.");
        return plans.get(memberIndex % plans.size());
    }

    private String notes(int memberIndex) {
        List<String> notes = List.of(
                "Pairing with QA on Thursday helped catch two edge cases early.",
                "Most of the week went to triage; feature work slipped a day.",
                "Design handoff was clean this week.",
                "Spent Friday on the usability session write-up.",
                "On call Tuesday, which ate about half a day.");
        return notes.get(memberIndex % notes.size());
    }

    private BigDecimal percentOf(BigDecimal total, int percent) {
        return total.multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
    }
}
