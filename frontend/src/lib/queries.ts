import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, toQuery } from "./api";
import type {
  ActivityItem,
  DashboardSummary,
  MemberStats,
  MemberStatusBreakdown,
  MemberSubmission,
  Page,
  Project,
  ProjectWorkload,
  ReportDetail,
  ReportSection,
  ReportStatus,
  ReportSummary,
  ReportVersion,
  ReviewAction,
  Role,
  SaveReportInput,
  TaskTypeHours,
  User,
  WeeklyTrendPoint,
} from "./types";

/**
 * Query keys are declared in one place so a mutation can invalidate exactly the
 * caches it affects, rather than blowing the whole store away.
 */
export const keys = {
  me: ["me"] as const,
  projects: (activeOnly: boolean) => ["projects", activeOnly] as const,
  project: (id: number) => ["project", id] as const,
  users: (filters: unknown) => ["users", filters] as const,
  myReports: (filters: unknown) => ["reports", "mine", filters] as const,
  report: (id: number) => ["report", id] as const,
  reportVersions: (id: number) => ["report", id, "versions"] as const,
  teamReports: (filters: unknown) => ["reports", "team", filters] as const,
  summary: (week?: string) => ["dashboard", "summary", week ?? "current"] as const,
  submissions: (week?: string) => ["dashboard", "submissions", week ?? "current"] as const,
  trend: (filters: unknown) => ["dashboard", "trend", filters] as const,
  workload: (filters: unknown) => ["dashboard", "workload", filters] as const,
  timeSplit: (filters: unknown) => ["dashboard", "time-split", filters] as const,
  statusByMember: (filters: unknown) => ["dashboard", "status-by-member", filters] as const,
  activity: (page: number) => ["dashboard", "activity", page] as const,
  section: (week: string | undefined, section: ReportSection) =>
    ["dashboard", "section", week ?? "current", section] as const,
  memberStats: (id: number) => ["member", id, "stats"] as const,
};

// -------------------------------------------------------------------- auth

/**
 * The signed-in user, or null.
 *
 * A 401 here is a normal answer for a signed-out visitor, not a failure, so it
 * resolves to null and retries are disabled — otherwise every anonymous page
 * load would fire three doomed requests.
 */
export function useMe(options?: Partial<UseQueryOptions<User | null>>) {
  return useQuery<User | null>({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api.get<User>("/auth/me");
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<User>("/auth/login", body),
    onSuccess: (user) => {
      queryClient.setQueryData(keys.me, user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string; jobTitle?: string }) =>
      api.post<User>("/auth/register", body),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: () => {
      // Clear everything: the next user must not see the previous one's cache.
      queryClient.clear();
    },
  });
}

// ---------------------------------------------------------------- projects

export function useProjects(activeOnly = true) {
  return useQuery({
    queryKey: keys.projects(activeOnly),
    queryFn: () => api.get<Project[]>(`/projects${toQuery({ activeOnly })}`),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: keys.project(id),
    queryFn: () => api.get<Project>(`/projects/${id}`),
    enabled: Number.isFinite(id),
  });
}

type ProjectInput = {
  name: string;
  code: string;
  description?: string | null;
  color?: string | null;
  active?: boolean;
};

export function useSaveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: ProjectInput & { id?: number }) =>
      id ? api.put<Project>(`/projects/${id}`, body) : api.post<Project>("/projects", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useAssignProjectMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userIds }: { id: number; userIds: number[] }) =>
      api.put<Project>(`/projects/${id}/members`, { userIds }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: keys.project(project.id) });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// ------------------------------------------------------------------ users

export interface UserFilters {
  role?: Role | "";
  active?: boolean | "";
  search?: string;
  page?: number;
  size?: number;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: keys.users(filters),
    queryFn: () => api.get<Page<User>>(`/users${toQuery({ ...filters })}`),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      role: Role;
      jobTitle?: string;
    }) => api.post<User>("/users", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      api.patch<User>(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.patch<User>(`/users/${id}/status`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ---------------------------------------------------------------- reports

export interface ReportFilters {
  status?: ReportStatus | "";
  projectId?: number | "";
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export function useMyReports(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: keys.myReports(filters),
    queryFn: () => api.get<Page<ReportSummary>>(`/reports/mine${toQuery({ ...filters })}`),
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: keys.report(id),
    queryFn: () => api.get<ReportDetail>(`/reports/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useReportVersions(id: number) {
  return useQuery({
    queryKey: keys.reportVersions(id),
    queryFn: () => api.get<ReportVersion[]>(`/reports/${id}/versions`),
    enabled: Number.isFinite(id),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveReportInput) => api.post<ReportDetail>("/reports", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: SaveReportInput & { id: number }) =>
      api.put<ReportDetail>(`/reports/${id}`, body),
    onSuccess: (report) => {
      queryClient.setQueryData(keys.report(report.id), report);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useSubmitReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ReportDetail>(`/reports/${id}/submit`),
    onSuccess: (report) => {
      queryClient.setQueryData(keys.report(report.id), report);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---------------------------------------------------------------- manager

export interface TeamReportFilters extends ReportFilters {
  userId?: number | "";
  weekStart?: string;
}

export function useTeamReports(filters: TeamReportFilters = {}) {
  return useQuery({
    queryKey: keys.teamReports(filters),
    queryFn: () => api.get<Page<ReportSummary>>(`/manager/reports${toQuery({ ...filters })}`),
  });
}

export function useReviewReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      comment,
    }: {
      id: number;
      action: ReviewAction;
      comment?: string;
    }) => api.post<ReportDetail>(`/manager/reports/${id}/review`, { action, comment }),
    onSuccess: (report) => {
      queryClient.setQueryData(keys.report(report.id), report);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// -------------------------------------------------------------- dashboard

export function useDashboardSummary(weekStart?: string) {
  return useQuery({
    queryKey: keys.summary(weekStart),
    queryFn: () => api.get<DashboardSummary>(`/manager/dashboard/summary${toQuery({ weekStart })}`),
  });
}

export function useSubmissions(weekStart?: string) {
  return useQuery({
    queryKey: keys.submissions(weekStart),
    queryFn: () =>
      api.get<MemberSubmission[]>(`/manager/dashboard/submissions${toQuery({ weekStart })}`),
  });
}

export function useTasksTrend(filters: { from?: string; to?: string; userId?: number } = {}) {
  return useQuery({
    queryKey: keys.trend(filters),
    queryFn: () =>
      api.get<WeeklyTrendPoint[]>(`/manager/dashboard/tasks-trend${toQuery({ ...filters })}`),
  });
}

export function useWorkloadByProject(filters: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: keys.workload(filters),
    queryFn: () =>
      api.get<ProjectWorkload[]>(
        `/manager/dashboard/workload-by-project${toQuery({ ...filters })}`,
      ),
  });
}

export function useTimeByTaskType(filters: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: keys.timeSplit(filters),
    queryFn: () =>
      api.get<TaskTypeHours[]>(`/manager/dashboard/time-by-task-type${toQuery({ ...filters })}`),
  });
}

export function useStatusByMember(filters: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: keys.statusByMember(filters),
    queryFn: () =>
      api.get<MemberStatusBreakdown[]>(
        `/manager/dashboard/status-by-member${toQuery({ ...filters })}`,
      ),
  });
}

export function useActivity(page = 0, size = 10) {
  return useQuery({
    queryKey: keys.activity(page),
    queryFn: () => api.get<Page<ActivityItem>>(`/manager/dashboard/activity${toQuery({ page, size })}`),
  });
}

export function useTeamSection(section: ReportSection, weekStart?: string) {
  return useQuery({
    queryKey: keys.section(weekStart, section),
    queryFn: () =>
      api.get<import("./types").TeamSectionItem[]>(
        `/manager/dashboard/section${toQuery({ section, weekStart })}`,
      ),
  });
}

export function useMemberStats(userId: number) {
  return useQuery({
    queryKey: keys.memberStats(userId),
    queryFn: () => api.get<MemberStats>(`/manager/members/${userId}/stats`),
    enabled: Number.isFinite(userId),
  });
}
