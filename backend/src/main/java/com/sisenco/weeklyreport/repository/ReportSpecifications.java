package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Report;
import com.sisenco.weeklyreport.domain.ReportStatus;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

/**
 * Composable filters for report list queries.
 *
 * <p>Every factory returns {@code null} for a null argument, and
 * {@link #combine} drops those, so a caller can pass whatever subset of filters
 * the request actually supplied without branching.
 */
public final class ReportSpecifications {

    private static final String WEEK_START = "weekStart";
    private static final String STATUS = "status";

    private ReportSpecifications() {}

    public static Specification<Report> ownedBy(Long userId) {
        return userId == null ? null : (root, q, cb) -> cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Report> hasStatus(ReportStatus status) {
        return status == null ? null : (root, q, cb) -> cb.equal(root.get(STATUS), status);
    }

    public static Specification<Report> hasProject(Long projectId) {
        return projectId == null ? null : (root, q, cb) -> cb.equal(root.get("project").get("id"), projectId);
    }

    public static Specification<Report> inWeek(LocalDate weekStart) {
        return weekStart == null ? null : (root, q, cb) -> cb.equal(root.get(WEEK_START), weekStart);
    }

    public static Specification<Report> weekStartFrom(LocalDate from) {
        return from == null ? null : (root, q, cb) -> cb.greaterThanOrEqualTo(root.get(WEEK_START), from);
    }

    public static Specification<Report> weekStartTo(LocalDate to) {
        return to == null ? null : (root, q, cb) -> cb.lessThanOrEqualTo(root.get(WEEK_START), to);
    }

    /**
     * Hides drafts belonging to other people.
     *
     * <p>The brief is explicit that a draft is "only visible to them", so a
     * manager browsing the team dashboard must not see one. Applying this at the
     * query level means a manager cannot reach a foreign draft even by guessing
     * filter combinations.
     */
    public static Specification<Report> visibleToManager() {
        return (root, q, cb) -> cb.notEqual(root.get(STATUS), ReportStatus.DRAFT);
    }

    /** Combines the given specifications, ignoring any that are null. */
    @SafeVarargs
    public static Specification<Report> combine(Specification<Report>... specs) {
        List<Specification<Report>> present = new ArrayList<>();
        for (Specification<Report> spec : specs) {
            if (spec != null) {
                present.add(spec);
            }
        }
        return Specification.allOf(present);
    }
}
