package com.sisenco.weeklyreport.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

/** A project or work category a weekly report can be tagged with. */
@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Project extends AuditedEntity {

    @Column(nullable = false, length = 120)
    private String name;

    /** Short stable identifier, e.g. CLIENT-A. Unique. */
    @Column(nullable = false, length = 30, unique = true)
    private String code;

    @Column(length = 500)
    private String description;

    /** Hex colour used to keep the project consistent across dashboard charts. */
    @Column(length = 9)
    private String color;

    @Column(nullable = false)
    private boolean active;

    /**
     * Which team members work on this project. Optional per the brief.
     *
     * <p>An empty set means the project is open to everyone, not that it is
     * closed to everyone — otherwise a project would be unusable between being
     * created and having someone assigned to it.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "project_members",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> members = new LinkedHashSet<>();

    /**
     * Whether {@code userId} may tag a report against this project.
     *
     * <p>Only meaningful for members; a manager sees every project. Call inside
     * a transaction — the membership set is lazy.
     */
    public boolean isAvailableTo(Long userId) {
        return members.isEmpty() || members.stream().anyMatch(member -> member.getId().equals(userId));
    }
}
