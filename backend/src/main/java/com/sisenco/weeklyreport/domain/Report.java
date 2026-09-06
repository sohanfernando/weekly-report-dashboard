package com.sisenco.weeklyreport.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/**
 * One weekly report for one person for one week.
 *
 * <p>This entity holds no report <em>content</em> — only ownership, the week it
 * covers, and where it sits in the review lifecycle. Content lives in
 * {@link ReportVersion}, so a correction cycle adds a new snapshot instead of
 * overwriting what the manager already reviewed.
 */
@Entity
@Table(name = "reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Report extends AuditedEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    /** Monday of the week being reported on. Unique per user. */
    @Column(name = "week_start", nullable = false)
    private LocalDate weekStart;

    @Column(name = "week_end", nullable = false)
    private LocalDate weekEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReportStatus status;

    /**
     * The version currently under review, or being edited if the report is a
     * draft. Denormalised so listing reports does not need a subquery for the
     * newest version.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private ReportVersion currentVersion;

    /** When the report was most recently submitted for review. */
    @Column(name = "submitted_at")
    private Instant submittedAt;

    /** When a manager most recently approved or sent it back. */
    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNo ASC")
    @Builder.Default
    private List<ReportVersion> versions = new ArrayList<>();

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<ReportReview> reviews = new ArrayList<>();

    /** True when {@code candidateUserId} owns this report. */
    public boolean isOwnedBy(Long candidateUserId) {
        return user != null && user.getId() != null && user.getId().equals(candidateUserId);
    }

    /** The single version the owner is currently allowed to edit, if any. */
    public Optional<ReportVersion> editableVersion() {
        return versions.stream().filter(ReportVersion::isEditable).findFirst();
    }

    public int nextVersionNo() {
        return versions.stream()
                .map(ReportVersion::getVersionNo)
                .max(Comparator.naturalOrder())
                .orElse(0)
                + 1;
    }

    /** Most recent review action, which is the comment the owner must address. */
    public Optional<ReportReview> latestReview() {
        return reviews.stream().max(Comparator.comparing(ReportReview::getCreatedAt));
    }
}
