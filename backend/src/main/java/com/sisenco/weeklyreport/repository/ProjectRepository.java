package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    Optional<Project> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<Project> findByActiveTrueOrderByNameAsc();

    /**
     * Projects with their membership already loaded.
     *
     * <p>The list view shows how many people are on each project, and reading that
     * from a lazy collection would fire one query per row. A fetch join makes it
     * one query for the page.
     */
    @Query("select distinct p from Project p left join fetch p.members order by p.name")
    List<Project> findAllWithMembers();

    @Query("""
            select distinct p from Project p
              left join fetch p.members
            where p.active = true
            order by p.name
            """)
    List<Project> findActiveWithMembers();
}
