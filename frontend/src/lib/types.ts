/**
 * Wire types, mirroring the backend DTOs in
 * `com.sisenco.weeklyreport.dto`.
 *
 * Kept hand-written rather than generated: the API surface is small enough that
 * a generator would cost more than it saves, and these carry comments a schema
 * cannot.
 */

// ----------------------------------------------------------------- enums

export type Role = "MEMBER" | "MANAGER";

export type ReportStatus = "DRAFT" | "SUBMITTED" | "NEEDS_CORRECTION" | "APPROVED";

/** ReportStatus plus the one state it cannot express: no report filed at all. */
export type SubmissionState = ReportStatus | "NOT_STARTED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type TaskType = "DEVELOPMENT" | "TESTING" | "MEETINGS" | "DOCUMENTATION" | "OTHER";
export type ReviewAction = "APPROVE" | "REQUEST_CHANGES";
export type ReportSection = "BLOCKERS" | "ACHIEVEMENTS";

export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const TASK_STATUSES: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED"];
export const TASK_TYPES: TaskType[] = [
  "DEVELOPMENT",
  "TESTING",
  "MEETINGS",
  "DOCUMENTATION",
  "OTHER",
];

// ------------------------------------------------------------- envelopes

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** RFC 9457 problem document, as returned by the backend for every failure. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  /** Present on validation failures: field name to message. */
  errors?: Record<string, string>;
}

// ------------------------------------------------------------------ core

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  active: boolean;
  createdAt: string | null;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  description: string | null;
  color: string | null;
  active: boolean;
  /** Null in list responses, where the join would be wasted work. */
  members: User[] | null;
  /** Always present, so a list can show membership without the objects. */
  memberCount: number;
  createdAt: string;
}

// --------------------------------------------------------------- reports

export interface TaskView {
  id: number | null;
  name: string;
  priority: TaskPriority;
  plannedPct: number;
  actualPct: number;
  status: TaskStatus;
  hoursPlanned: number;
  hoursSpent: number;
  deliverable: string | null;
}

/** Shared by blockers and achievements: text plus a "key item" flag. */
export interface NoteView {
  id: number | null;
  description: string;
  key: boolean;
  /** Only meaningful for blockers. */
  resolved: boolean;
}

export interface HoursView {
  taskType: TaskType;
  hours: number;
}

export interface ReportVersion {
  id: number;
  versionNo: number;
  editable: boolean;
  submittedAt: string | null;
  tasks: TaskView[];
  nextWeekPlan: string | null;
  blockers: NoteView[];
  achievements: NoteView[];
  hours: HoursView[];
  notes: string | null;
  links: string | null;
}

export interface ReportReview {
  id: number;
  action: ReviewAction;
  comment: string | null;
  reviewerName: string;
  /** Which snapshot the comment was written against. */
  versionNo: number;
  createdAt: string;
}

export interface ReportSummary {
  id: number;
  userId: number;
  userName: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  weekStart: string;
  weekEnd: string;
  status: ReportStatus;
  currentVersionNo: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

export interface ReportDetail {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  weekStart: string;
  weekEnd: string;
  status: ReportStatus;
  /** Whether the *current viewer* may edit it right now. */
  editable: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
  currentVersion: ReportVersion | null;
  /** Every snapshot, oldest first. */
  versions: ReportVersion[];
  /** Every review action, newest first. */
  reviews: ReportReview[];
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------- dashboard

export interface DashboardSummary {
  weekStart: string;
  weekEnd: string;
  weekClosed: boolean;
  expectedMembers: number;
  submitted: number;
  pending: number;
  late: number;
  notStarted: number;
  drafts: number;
  awaitingReview: number;
  needsCorrection: number;
  approved: number;
  complianceRate: number;
  openBlockers: number;
}

export interface MemberSubmission {
  userId: number;
  userName: string;
  jobTitle: string | null;
  state: SubmissionState;
  reportId: number | null;
  versionNo: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface WeeklyTrendPoint {
  weekStart: string;
  reportCount: number;
  completedTasks: number;
  totalTasks: number;
}

export interface ProjectWorkload {
  projectId: number;
  projectName: string;
  projectColor: string | null;
  reportCount: number;
  taskCount: number;
  hoursSpent: number;
}

export interface TaskTypeHours {
  taskType: TaskType;
  hours: number;
}

export interface MemberStatusBreakdown {
  userId: number;
  userName: string;
  submitted: number;
  needsCorrection: number;
  approved: number;
  total: number;
}

export interface ActivityItem {
  id: number;
  action: ReviewAction;
  comment: string | null;
  reviewerName: string;
  memberName: string;
  reportId: number;
  weekStart: string;
  versionNo: number;
  createdAt: string;
}

export interface MemberStats {
  member: User;
  totalReports: number;
  drafts: number;
  awaitingReview: number;
  needsCorrection: number;
  approved: number;
  approvalRate: number;
  completedTasks: number;
  totalTasks: number;
  hoursSpent: number;
}

export interface TeamSectionItem {
  userId: number;
  userName: string;
  reportId: number;
  entries: { description: string; key: boolean; resolved: boolean }[];
}

// -------------------------------------------------------------- requests

export interface TaskInput {
  name: string;
  priority: TaskPriority;
  plannedPct: number;
  actualPct: number;
  status: TaskStatus;
  hoursPlanned: number;
  hoursSpent: number;
  deliverable?: string | null;
}

export interface NoteInput {
  description: string;
  key: boolean;
  resolved?: boolean;
}

export interface SaveReportInput {
  weekStart: string;
  projectId: number | null;
  tasks: TaskInput[];
  nextWeekPlan?: string | null;
  blockers: NoteInput[];
  achievements: NoteInput[];
  hours: { taskType: TaskType; hours: number }[];
  notes?: string | null;
  links?: string | null;
}
