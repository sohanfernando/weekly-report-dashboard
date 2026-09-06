package com.sisenco.weeklyreport.service;

import com.sisenco.weeklyreport.dto.request.AssignProjectMembersRequest;
import com.sisenco.weeklyreport.dto.request.CreateProjectRequest;
import com.sisenco.weeklyreport.dto.request.UpdateProjectRequest;
import com.sisenco.weeklyreport.dto.response.ProjectResponse;
import java.util.List;

/**
 * Projects and work categories (Section 5 of the brief).
 *
 * <p>Reading is open to any authenticated user, because a member has to pick a
 * project when tagging their weekly report. Writing is manager-only, enforced at
 * the controller.
 *
 * @see com.sisenco.weeklyreport.service.impl.ProjectServiceImpl
 */
public interface ProjectService {

    /** @param activeOnly true to hide archived projects, as the report form does */
    List<ProjectResponse> list(boolean activeOnly);

    ProjectResponse get(Long projectId);

    ProjectResponse create(CreateProjectRequest request);

    ProjectResponse update(Long projectId, UpdateProjectRequest request);

    /**
     * Deletes a project outright, but only while nothing references it.
     *
     * <p>Reports point at the project they were tagged with, and deleting one
     * out from under historical reports would silently rewrite what a team
     * reported months ago. Once any report uses it, the project can only be
     * archived — the caller is told exactly that.
     *
     * @throws com.sisenco.weeklyreport.exception.ConflictException if reports reference it
     */
    void delete(Long projectId);

    /** Replaces the project's membership with exactly the given users. */
    ProjectResponse assignMembers(Long projectId, AssignProjectMembersRequest request);
}
