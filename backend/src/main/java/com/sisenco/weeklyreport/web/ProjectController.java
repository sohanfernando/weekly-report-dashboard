package com.sisenco.weeklyreport.web;

import com.sisenco.weeklyreport.dto.request.AssignProjectMembersRequest;
import com.sisenco.weeklyreport.dto.request.CreateProjectRequest;
import com.sisenco.weeklyreport.dto.request.UpdateProjectRequest;
import com.sisenco.weeklyreport.dto.response.ProjectResponse;
import com.sisenco.weeklyreport.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Projects and work categories (Section 5).
 *
 * <p>Reads are open to any authenticated user because members need the list to
 * tag a report. Writes are manager-only, applied per method rather than to the
 * whole class so the split is visible at each endpoint.
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /** @param activeOnly defaults true, which is what the report form wants */
    @GetMapping
    public List<ProjectResponse> list(@RequestParam(defaultValue = "true") boolean activeOnly) {
        return projectService.list(activeOnly);
    }

    @GetMapping("/{projectId}")
    public ProjectResponse get(@PathVariable Long projectId) {
        return projectService.get(projectId);
    }

    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody CreateProjectRequest request) {
        return projectService.create(request);
    }

    @PutMapping("/{projectId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ProjectResponse update(@PathVariable Long projectId, @Valid @RequestBody UpdateProjectRequest request) {
        return projectService.update(projectId, request);
    }

    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasRole('MANAGER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long projectId) {
        projectService.delete(projectId);
    }

    @PutMapping("/{projectId}/members")
    @PreAuthorize("hasRole('MANAGER')")
    public ProjectResponse assignMembers(
            @PathVariable Long projectId, @Valid @RequestBody AssignProjectMembersRequest request) {
        return projectService.assignMembers(projectId, request);
    }
}
