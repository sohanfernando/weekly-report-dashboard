import { format, formatDistanceToNow, parseISO, startOfWeek, addWeeks } from "date-fns";
import type { ReportStatus, SubmissionState, TaskStatus, TaskType } from "./types";

/**
 * A report's week is always identified by its Monday, and the backend rejects
 * anything else. These helpers keep that convention in one place so no page has
 * to remember it.
 */
export function mondayOf(date: Date = new Date()): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function shiftWeeks(isoDate: string, weeks: number): string {
  return format(addWeeks(parseISO(isoDate), weeks), "yyyy-MM-dd");
}

/** "4 – 10 Aug 2026", collapsing the month when both ends share one. */
export function weekRangeLabel(weekStart: string, weekEnd: string): string {
  const start = parseISO(weekStart);
  const end = parseISO(weekEnd);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${format(start, "d")} – ${format(end, "d MMM yyyy")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export function shortDate(iso: string | null | undefined): string {
  return iso ? format(parseISO(iso), "d MMM yyyy") : "—";
}

export function dateTime(iso: string | null | undefined): string {
  return iso ? format(parseISO(iso), "d MMM yyyy, HH:mm") : "—";
}

export function relative(iso: string | null | undefined): string {
  return iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "—";
}

/** Turns SCREAMING_SNAKE into "Screaming snake" for display. */
export function humanise(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const STATUS_LABEL: Record<SubmissionState, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  NEEDS_CORRECTION: "Needs correction",
  APPROVED: "Approved",
  NOT_STARTED: "Not started",
};

/**
 * Status colours, used by badges and charts alike so a status looks the same
 * everywhere. Amber for "needs correction" rather than red: it is a normal step
 * in the review cycle, not a failure.
 */
export const STATUS_STYLE: Record<SubmissionState, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  SUBMITTED: "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900",
  NEEDS_CORRECTION:
    "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  APPROVED:
    "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  NOT_STARTED:
    "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
};

export const STATUS_CHART_COLOR: Record<ReportStatus | "NOT_STARTED", string> = {
  DRAFT: "#94a3b8",
  SUBMITTED: "#0ea5e9",
  NEEDS_CORRECTION: "#f59e0b",
  APPROVED: "#10b981",
  NOT_STARTED: "#f43f5e",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

/** Distinct hues for the task-type split, ordered to stay legible side by side. */
export const TASK_TYPE_COLOR: Record<TaskType, string> = {
  DEVELOPMENT: "#4f46e5",
  TESTING: "#0ea5e9",
  MEETINGS: "#f59e0b",
  DOCUMENTATION: "#10b981",
  OTHER: "#94a3b8",
};

export function hours(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0h";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

export function percent(value: number | null | undefined): string {
  return `${Math.round((value ?? 0) * 10) / 10}%`;
}
