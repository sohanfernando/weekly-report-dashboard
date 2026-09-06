import { format, formatDistanceToNow, parseISO, startOfWeek, addWeeks } from "date-fns";
import type { SubmissionState, TaskStatus, TaskType } from "./types";

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
 * The one place a report status becomes a colour.
 *
 * Every status rendering in the app — history table, dashboard, report detail,
 * review queue — goes through {@link STATUS_STYLE} via the StatusBadge, so a
 * status can never mean two different colours on two different screens.
 *
 * Each badge is the status colour as text on a 10% tint of itself, with a
 * matching ring. That keeps the hue identifiable while the label stays legible,
 * which solid fills at these sizes do not.
 */
export const STATUS_STYLE: Record<SubmissionState, string> = {
  DRAFT: "bg-status-draft/10 text-status-draft ring-status-draft/25",
  SUBMITTED: "bg-status-submitted/10 text-status-submitted ring-status-submitted/25",
  NEEDS_CORRECTION: "bg-status-correction/10 text-status-correction ring-status-correction/25",
  APPROVED: "bg-status-approved/10 text-status-approved ring-status-approved/25",
  NOT_STARTED: "bg-status-missing/10 text-status-missing ring-status-missing/25",
};

/** The same status colours as literals, for Recharts, which cannot read classes. */
export const STATUS_CHART_COLOR: Record<SubmissionState, string> = {
  DRAFT: "#9CA3AF",
  SUBMITTED: "#3B82F6",
  NEEDS_CORRECTION: "#F59E0B",
  APPROVED: "#10B981",
  NOT_STARTED: "#EF4444",
};

/**
 * Chart series order, applied consistently across every chart so the nth series
 * is always the same colour wherever a reader looks.
 */
export const CHART_SERIES = [
  "#4F46E5",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
] as const;

/** Picks a series colour by index, wrapping if there are more series than colours. */
export function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

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

/** Task types take the first five series colours, in the system's order. */
export const TASK_TYPE_COLOR: Record<TaskType, string> = {
  DEVELOPMENT: CHART_SERIES[0],
  TESTING: CHART_SERIES[1],
  MEETINGS: CHART_SERIES[2],
  DOCUMENTATION: CHART_SERIES[3],
  OTHER: CHART_SERIES[4],
};

export function hours(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0h";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

export function percent(value: number | null | undefined): string {
  return `${Math.round((value ?? 0) * 10) / 10}%`;
}
