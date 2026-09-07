package com.sisenco.weeklyreport.service.impl;

import com.sisenco.weeklyreport.domain.Project;
import com.sisenco.weeklyreport.domain.User;
import com.sisenco.weeklyreport.dto.request.AssignProjectMembersRequest;
import com.sisenco.weeklyreport.dto.request.CreateProjectRequest;
import com.sisenco.weeklyreport.dto.request.UpdateProjectRequest;
import com.sisenco.weeklyreport.dto.response.ProjectResponse;
import com.sisenco.weeklyreport.exception.BadRequestException;
import com.sisenco.weeklyreport.exception.ConflictException;
import com.sisenco.weeklyreport.exception.NotFoundException;
import com.sisenco.weeklyreport.repository.ProjectRepository;
import com.sisenco.weeklyreport.repository.ReportRepository;
import com.sisenco.weeklyreport.repository.UserRepository;
import com.sisenco.weeklyreport.service.ProjectService;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> list(boolean activeOnly) {
        // Fetch-join variants: summary() reads the membership count, and a lazy
        // collection would turn that into one query per project.
        List<Project> projects = activeOnly
                ? projectRepository.findActiveWithMembers()
                : projectRepository.findAllWithMembers();
        return projects.stream().map(ProjectResponse::summary).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse get(Long projectId) {
        return ProjectResponse.detail(findProject(projectId));
    }

    @Override
    @Transactional
    public ProjectResponse create(CreateProjectRequest request) {
        String code = normaliseCode(request.code());
        if (projectRepository.existsByCodeIgnoreCase(code)) {
            throw new ConflictException("A project with code %s already exists".formatted(code));
        }

        Project project = Project.builder()
                .name(request.name().trim())
                .code(code)
                .description(request.description())
                .color(request.color())
                .active(true)
                .build();

        return ProjectResponse.detail(projectRepository.save(project));
    }

    @Override
    @Transactional
    public ProjectResponse update(Long projectId, UpdateProjectRequest request) {
        Project project = findProject(projectId);
        String code = normaliseCode(request.code());

        // Only a collision with a *different* project is a conflict; keeping your
        // own code unchanged must stay allowed.
        projectRepository.findByCodeIgnoreCase(code).filter(other -> !other.getId().equals(projectId))
                .ifPresent(other -> {
                    throw new ConflictException("A project with code %s already exists".formatted(code));
                });

        project.setName(request.name().trim());
        project.setCode(code);
        project.setDescription(request.description());
        project.setColor(request.color());
        project.setActive(Boolean.TRUE.equals(request.active()));

        return ProjectResponse.detail(projectRepository.save(project));
    }

    @Override
    @Transactional
    public void delete(Long projectId) {
        Project project = findProject(projectId);

        if (reportRepository.existsByProjectId(projectId)) {
            throw new ConflictException(
                    "This project is used by existing reports and cannot be deleted. "
                            + "Set it to inactive instead, which hides it from new reports "
                            + "while keeping past ones readable.");
        }

        projectRepository.delete(project);
    }

    @Override
    @Transactional
    public ProjectResponse assignMembers(Long projectId, AssignProjectMembersRequest request) {
        Project project = findProject(projectId);
        Set<Long> requested = request.userIds();

        Set<User> members = new LinkedHashSet<>(userRepository.findAllById(requested));
        if (members.size() != requested.size()) {
            // findAllById silently drops ids that do not exist; say so rather than
            // quietly assigning a smaller set than the caller asked for.
            throw new BadRequestException("One or more of the given user ids does not exist");
        }

        project.getMembers().clear();
        project.getMembers().addAll(members);

        return ProjectResponse.detail(projectRepository.save(project));
    }

    private Project findProject(Long projectId) {
        return projectRepository.findById(projectId).orElseThrow(() -> NotFoundException.of("Project", projectId));
    }

    /** Codes are compared case-insensitively, so store them in one canonical case. */
    private String normaliseCode(String code) {
        return code.trim().toUpperCase();
    }
}
