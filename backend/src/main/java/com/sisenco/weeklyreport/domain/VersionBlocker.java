package com.sisenco.weeklyreport.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A blocker or challenge raised in a report version. */
@Entity
@Table(name = "version_blockers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionBlocker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", nullable = false)
    private ReportVersion version;

    @Column(nullable = false, length = 1000)
    private String description;

    /** At most one per version: the key issue of the week. Enforced in the service. */
    @Column(name = "is_key", nullable = false)
    private boolean key;

    /** Unresolved blockers feed the "open blockers across the team" metric. */
    @Column(nullable = false)
    private boolean resolved;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
