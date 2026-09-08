package com.sisenco.weeklyreport.ai;

import com.sisenco.weeklyreport.domain.ReportSection;
import com.sisenco.weeklyreport.domain.Role;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.response.MemberStatsResponse;
import com.sisenco.weeklyreport.dto.response.ReportDetailResponse;
import com.sisenco.weeklyreport.dto.response.ReportSummaryResponse;
import com.sisenco.weeklyreport.dto.response.TeamSectionItemResponse;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.security.AppUserPrincipal;
import com.sisenco.weeklyreport.service.DashboardService;
import com.sisenco.weeklyreport.service.ReportService;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * The four things the assistant is allowed to look up, and the code that runs
 * them (Section 8).
 *
 * <h2>Why these go through the services</h2>
 *
 * Every tool calls the same {@link ReportService} and {@link DashboardService}
 * methods the REST API calls, as the manager who asked the question. Nothing
 * here touches a repository for report content or writes its own query. That is
 * what stops the assistant becoming a second, weaker way into the data: the rule
 * excluding drafts lives in the dashboard service, so the assistant inherits it
 * rather than having to remember it.
 *
 * <h2>What the model is given</h2>
 *
 * Names and numbers, never database ids. There is nothing in a tool result the
 * model could use to address a row, and there are no tools that write, so the
 * assistant is read-only by construction rather than by instruction.
 *
 * <h2>Failure</h2>
 *
 * A tool that cannot answer returns a message to the <em>model</em> instead of
 * throwing. An unknown member name should let the assistant say so and carry on,
 * not fail the whole request.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatTools {

    /** A week has at most one report per member; this bounds a pathological team. */
    private static final int MAX_REPORTS_PER_WEEK = 25;

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private final ReportService reportService;
    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    // ----------------------------------------------------------- definitions

    /** The tool schemas handed to the model. */
    public List<GroqClient.Tool> definitions() {
        return List.of(
                new GroqClient.Tool(
                        "reportsForWeek",
                        "Read the weekly reports filed for one week: what each member worked on, "
                                + "their achievements, tasks, blockers and hours. Use this for any question "
                                + "about what people actually did. Omit memberName for the whole team.",
                        schema(Map.of(
                                "weekStart",
                                        param("string", "Monday of the week, as YYYY-MM-DD. "
                                                + "Omit for the current week."),
                                "memberName",
                                        param("string", "Full name of one team member. "
                                                + "Omit for the whole team.")))),
                new GroqClient.Tool(
                        "blockersAcrossTeam",
                        "Read every blocker the team raised in one week, grouped by member and split "
                                + "into open and resolved. Use this for questions about what is stuck or "
                                + "what is holding people up.",
                        schema(Map.of(
                                "weekStart",
                                param("string", "Monday of the week, as YYYY-MM-DD. "
                                        + "Omit for the current week.")))),
                new GroqClient.Tool(
                        "memberStats",
                        "Headline figures for one team member across their whole history: reports "
                                + "filed, approval rate, tasks completed and hours logged.",
                        required(
                                schema(Map.of(
                                        "memberName",
                                        param("string", "Full name of the team member."))),
                                "memberName")),
                new GroqClient.Tool(
                        "teamStats",
                        "Submission and workload figures for one week: who filed and who did not, "
                                + "compliance rate, review backlog, open blocker count, and how work was "
                                + "split across projects and task types. Use this for summaries and for "
                                + "questions about workload balance.",
                        schema(Map.of(
                                "weekStart",
                                param("string", "Monday of the week, as YYYY-MM-DD. "
                                        + "Omit for the current week.")))));
    }

    /** Active members, used to ground the model in real names. */
    public List<String> memberNames() {
        return userRepository.findByRoleAndActiveTrueOrderByNameAsc(Role.MEMBER).stream()
                .map(User::getName)
                .toList();
    }

    // -------------------------------------------------------------- dispatch

    /**
     * Runs one tool call and returns its result as JSON for the model to read.
     *
     * @param arguments raw JSON from the model, which may be malformed or name
     *     arguments that do not exist — both are answered, not thrown
     */
    public String run(String name, String arguments, AppUserPrincipal caller) {
        Map<String, Object> args;
        try {
            args = MAPPER.readValue(arguments == null || arguments.isBlank() ? "{}" : arguments, Map.class);
        } catch (RuntimeException ex) {
            return error("Those arguments were not valid JSON. Call the tool again with a JSON object.");
        }

        try {
            return switch (name) {
                case "reportsForWeek" -> reportsForWeek(text(args, "memberName"), week(args), caller);
                case "blockersAcrossTeam" -> blockersAcrossTeam(week(args));
                case "memberStats" -> memberStats(text(args, "memberName"));
                case "teamStats" -> teamStats(week(args));
                default -> error("There is no tool called " + name + ".");
            };
        } catch (IllegalArgumentException ex) {
            // Bad input from the model: let it read the reason and try again.
            return error(ex.getMessage());
        } catch (RuntimeException ex) {
            log.warn("Chat tool {} failed", name, ex);
            return error("That lookup failed. Tell the user you could not retrieve it.");
        }
    }

    // ----------------------------------------------------------------- tools

    private String reportsForWeek(String memberName, LocalDate weekStart, AppUserPrincipal caller) {
        Long userId = memberName == null ? null : resolve(memberName).getId();
        Pageable page = PageRequest.of(
                0, MAX_REPORTS_PER_WEEK, Sort.by(Sort.Direction.DESC, "weekStart"));

        // listTeam is the manager's own list endpoint, so drafts are already
        // excluded here rather than being filtered out again below.
        List<ReportSummaryResponse> summaries =
                reportService.listTeam(userId, null, null, weekStart, null, null, page).content();

        List<ReportDigest> digests = new ArrayList<>();
        for (ReportSummaryResponse summary : summaries) {
            ReportDetailResponse detail = reportService.get(summary.id(), caller);
            digests.add(ReportDigest.of(detail));
        }

        if (digests.isEmpty()) {
            return json(Map.of(
                    "week", weekStart.toString(),
                    "reports", List.of(),
                    "note", "Nobody submitted a report for that week."));
        }
        return json(Map.of("week", weekStart.toString(), "reports", digests));
    }

    private String blockersAcrossTeam(LocalDate weekStart) {
        List<Map<String, Object>> rows = dashboardService.teamSection(weekStart, ReportSection.BLOCKERS).stream()
                .map(item -> Map.<String, Object>of(
                        "member",
                        item.userName(),
                        "open",
                        describe(item, false),
                        "resolved",
                        describe(item, true)))
                .filter(row -> !((List<?>) row.get("open")).isEmpty()
                        || !((List<?>) row.get("resolved")).isEmpty())
                .toList();

        if (rows.isEmpty()) {
            return json(Map.of(
                    "week", weekStart.toString(),
                    "blockers", List.of(),
                    "note", "Nobody raised a blocker that week."));
        }
        return json(Map.of("week", weekStart.toString(), "blockers", rows));
    }

    private String memberStats(String memberName) {
        if (memberName == null) {
            throw new IllegalArgumentException("memberName is required for memberStats.");
        }
        User member = resolve(memberName);
        MemberStatsResponse stats = dashboardService.memberStats(member.getId());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("member", stats.member().name());
        out.put("jobTitle", stats.member().jobTitle());
        out.put("reportsFiled", stats.totalReports());
        out.put("awaitingReview", stats.awaitingReview());
        out.put("needsCorrection", stats.needsCorrection());
        out.put("approved", stats.approved());
        out.put("approvalRatePercent", stats.approvalRate());
        out.put("tasksCompleted", stats.completedTasks());
        out.put("tasksTotal", stats.totalTasks());
        out.put("hoursLogged", stats.hoursSpent());
        return json(out);
    }

    private String teamStats(LocalDate weekStart) {
        var summary = dashboardService.summary(weekStart);
        var submissions = dashboardService.submissionStatus(weekStart);

        List<String> notSubmitted = submissions.stream()
                .filter(row -> !row.state().countsAsSubmitted())
                .map(row -> row.userName() + " (" + row.state() + ")")
                .toList();

        List<Map<String, Object>> byProject =
                dashboardService.workloadByProject(weekStart, weekStart).stream()
                        .map(row -> Map.<String, Object>of(
                                "project", row.projectName(),
                                "reports", row.reportCount(),
                                "tasks", row.taskCount(),
                                "hours", row.hoursSpent()))
                        .toList();

        List<Map<String, Object>> byTaskType =
                dashboardService.timeByTaskType(weekStart, weekStart).stream()
                        .map(row -> Map.<String, Object>of(
                                "taskType", row.taskType().name(), "hours", row.hours()))
                        .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("week", summary.weekStart().toString());
        out.put("weekEnded", summary.weekClosed());
        out.put("membersExpected", summary.expectedMembers());
        out.put("submitted", summary.submitted());
        out.put("notStarted", summary.notStarted());
        out.put("compliancePercent", summary.complianceRate());
        out.put("awaitingReview", summary.awaitingReview());
        out.put("needsCorrection", summary.needsCorrection());
        out.put("approved", summary.approved());
        out.put("openBlockers", summary.openBlockers());
        out.put("membersWhoDidNotSubmit", notSubmitted);
        out.put("workloadByProject", byProject);
        out.put("hoursByTaskType", byTaskType);
        return json(out);
    }

    // ---------------------------------------------------------------- shared

    /**
     * Matches a name the model produced against the real roster.
     *
     * <p>Exact first, then a unique prefix or substring, because a model asked
     * about "Priya" should not need the surname. An ambiguous match is refused
     * rather than guessed — answering about the wrong person is worse than
     * asking which one was meant.
     */
    private User resolve(String name) {
        String needle = name.trim().toLowerCase(Locale.ROOT);
        List<User> active = userRepository.findByActiveTrueOrderByNameAsc();

        List<User> exact = active.stream()
                .filter(user -> user.getName().toLowerCase(Locale.ROOT).equals(needle))
                .toList();
        if (exact.size() == 1) {
            return exact.get(0);
        }

        List<User> partial = active.stream()
                .filter(user -> user.getName().toLowerCase(Locale.ROOT).contains(needle))
                .toList();
        if (partial.size() == 1) {
            return partial.get(0);
        }
        if (partial.size() > 1) {
            throw new IllegalArgumentException("More than one person matches \"" + name
                    + "\": " + partial.stream().map(User::getName).toList()
                    + ". Ask the user which one they meant.");
        }
        throw new IllegalArgumentException("There is no active team member called \"" + name
                + "\". The team is: " + active.stream().map(User::getName).toList());
    }

    /** Missing or unparseable dates fall back to the current week. */
    private LocalDate week(Map<String, Object> args) {
        String raw = text(args, "weekStart");
        if (raw == null) {
            return LocalDate.now().with(DayOfWeek.MONDAY);
        }
        try {
            return LocalDate.parse(raw.trim()).with(DayOfWeek.MONDAY);
        } catch (RuntimeException ex) {
            throw new IllegalArgumentException(
                    "\"" + raw + "\" is not a date. Use YYYY-MM-DD, or omit it for the current week.");
        }
    }

    private String text(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) {
            return null;
        }
        String string = String.valueOf(value).trim();
        return string.isEmpty() || "null".equals(string) ? null : string;
    }

    private static Map<String, Object> schema(Map<String, Object> properties) {
        return Map.of("type", "object", "properties", properties, "required", List.of());
    }

    private static Map<String, Object> required(Map<String, Object> schema, String... names) {
        Map<String, Object> copy = new LinkedHashMap<>(schema);
        copy.put("required", List.of(names));
        return copy;
    }

    private static Map<String, Object> param(String type, String description) {
        return Map.of("type", type, "description", description);
    }

    private static String json(Object value) {
        return MAPPER.writeValueAsString(value);
    }

    private static String error(String message) {
        return json(Map.of("error", message));
    }

    /** One member's blockers, either the open ones or the resolved ones. */
    private static List<String> describe(TeamSectionItemResponse item, boolean resolved) {
        return item.entries().stream()
                .filter(entry -> entry.resolved() == resolved)
                .map(entry -> entry.key() ? entry.description() + " (key)" : entry.description())
                .toList();
    }

    // ----------------------------------------------------------------- shapes

    /**
     * One report, reduced to what a question could plausibly be about.
     *
     * <p>Deliberately not {@code ReportDetailResponse}: that carries ids, every
     * past version and the whole review history, which would cost tokens and
     * hand the model far more than it needs to answer.
     */
    private record ReportDigest(
            String member,
            String project,
            String week,
            String status,
            List<String> achievements,
            List<TaskDigest> tasks,
            List<String> blockers,
            String nextWeekPlan,
            BigDecimal hoursLogged) {

        static ReportDigest of(ReportDetailResponse report) {
            var version = report.currentVersion();
            if (version == null) {
                return new ReportDigest(
                        report.userName(),
                        report.projectName(),
                        report.weekStart().toString(),
                        report.status().name(),
                        List.of(),
                        List.of(),
                        List.of(),
                        null,
                        BigDecimal.ZERO);
            }
            BigDecimal hours = version.hours().stream()
                    .map(entry -> entry.hours() == null ? BigDecimal.ZERO : entry.hours())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            return new ReportDigest(
                    report.userName(),
                    report.projectName(),
                    report.weekStart().toString(),
                    report.status().name(),
                    version.achievements().stream()
                            .map(note -> note.key() ? note.description() + " (key)" : note.description())
                            .toList(),
                    version.tasks().stream()
                            .map(task -> new TaskDigest(
                                    task.name(), task.status().name(), task.actualPct(), task.hoursSpent()))
                            .toList(),
                    version.blockers().stream()
                            .map(note -> note.resolved()
                                    ? note.description() + " (resolved)"
                                    : note.description())
                            .toList(),
                    version.nextWeekPlan(),
                    hours);
        }
    }

    private record TaskDigest(String name, String status, int percentComplete, BigDecimal hoursSpent) {}

}
