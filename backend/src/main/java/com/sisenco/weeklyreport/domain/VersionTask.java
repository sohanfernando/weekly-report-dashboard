package com.sisenco.weeklyreport.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One row of the "tasks completed" table inside a report version. */
@Entity
@Table(name = "version_tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", nullable = false)
    private ReportVersion version;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority;

    @Column(name = "planned_pct", nullable = false)
    private int plannedPct;

    @Column(name = "actual_pct", nullable = false)
    private int actualPct;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskStatus status;

    @Column(name = "hours_planned", nullable = false, precision = 5, scale = 2)
    private BigDecimal hoursPlanned;

    @Column(name = "hours_spent", nullable = false, precision = 5, scale = 2)
    private BigDecimal hoursSpent;

    @Column(length = 500)
    private String deliverable;

    /** Preserves the order the member entered rows in. */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
