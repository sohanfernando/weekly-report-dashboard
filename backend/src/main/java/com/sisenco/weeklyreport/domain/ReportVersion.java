package com.sisenco.weeklyreport.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * An immutable snapshot of one weekly report's content.
 *
 * <p>Version 1 is created with the report. Submitting freezes the current
 * version ({@code editable = false}); when a manager requests changes the
 * service clones it into {@code versionNo + 1} and marks the clone editable.
 * Frozen versions are never mutated again, which is what lets a manager see
 * every past version of a week alongside the one under review.
 */
@Entity
@Table(name = "report_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReportVersion extends AuditedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    /** 1-based, unique within a report. */
    @Column(name = "version_no", nullable = false)
    private int versionNo;

    /** At most one version per report is editable: the working draft. */
    @Column(nullable = false)
    private boolean editable;

    /** Set when this snapshot was submitted for review. Null while a draft. */
    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "next_week_plan", length = 2000)
    private String nextWeekPlan;

    @Column(length = 2000)
    private String notes;

    /** Newline-separated URLs. */
    @Column(length = 2000)
    private String links;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<VersionTask> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<VersionBlocker> blockers = new ArrayList<>();

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<VersionAchievement> achievements = new ArrayList<>();

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VersionHours> hours = new ArrayList<>();

    /** The blocker flagged as the key issue for the week, if one was flagged. */
    public Optional<VersionBlocker> keyBlocker() {
        return blockers.stream().filter(VersionBlocker::isKey).findFirst();
    }

    /** The achievement flagged as the highlight of the week, if one was flagged. */
    public Optional<VersionAchievement> keyAchievement() {
        return achievements.stream().filter(VersionAchievement::isKey).findFirst();
    }
}
