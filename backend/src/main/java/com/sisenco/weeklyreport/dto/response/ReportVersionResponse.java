package com.sisenco.weeklyreport.dto.response;

import com.sisenco.weeklyreport.domain.ReportVersion;
import com.sisenco.weeklyreport.domain.TaskPriority;
import com.sisenco.weeklyreport.domain.TaskStatus;
import com.sisenco.weeklyreport.domain.TaskType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** One immutable snapshot of a report's content. */
public record ReportVersionResponse(
        Long id,
        int versionNo,
        boolean editable,
        Instant submittedAt,
        List<TaskView> tasks,
        String nextWeekPlan,
        List<NoteView> blockers,
        List<NoteView> achievements,
        List<HoursView> hours,
        String notes,
        String links) {

    public record TaskView(
            Long id,
            String name,
            TaskPriority priority,
            int plannedPct,
            int actualPct,
            TaskStatus status,
            BigDecimal hoursPlanned,
            BigDecimal hoursSpent,
            String deliverable) {}

    /** Shared by blockers and achievements: both are text plus a "key" flag. */
    public record NoteView(Long id, String description, boolean key, boolean resolved) {}

    public record HoursView(TaskType taskType, BigDecimal hours) {}

    /** Call inside a transaction: the child collections are lazy. */
    public static ReportVersionResponse from(ReportVersion version) {
        return new ReportVersionResponse(
                version.getId(),
                version.getVersionNo(),
                version.isEditable(),
                version.getSubmittedAt(),
                version.getTasks().stream()
                        .map(t -> new TaskView(
                                t.getId(),
                                t.getName(),
                                t.getPriority(),
                                t.getPlannedPct(),
                                t.getActualPct(),
                                t.getStatus(),
                                t.getHoursPlanned(),
                                t.getHoursSpent(),
                                t.getDeliverable()))
                        .toList(),
                version.getNextWeekPlan(),
                version.getBlockers().stream()
                        .map(b -> new NoteView(b.getId(), b.getDescription(), b.isKey(), b.isResolved()))
                        .toList(),
                version.getAchievements().stream()
                        .map(a -> new NoteView(a.getId(), a.getDescription(), a.isKey(), false))
                        .toList(),
                version.getHours().stream()
                        .map(h -> new HoursView(h.getTaskType(), h.getHours()))
                        .toList(),
                version.getNotes(),
                version.getLinks());
    }
}
