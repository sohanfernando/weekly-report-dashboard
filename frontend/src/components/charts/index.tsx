"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import {
  STATUS_CHART_COLOR,
  TASK_TYPE_COLOR,
  TASK_TYPE_LABEL,
  hours,
  weekRangeLabel,
} from "@/lib/format";
import type {
  MemberStatusBreakdown,
  ProjectWorkload,
  TaskTypeHours,
  WeeklyTrendPoint,
} from "@/lib/types";
import { format, parseISO } from "date-fns";

/**
 * Dashboard charts.
 *
 * Colours come from the shared palette in lib/format so a status or a project
 * looks the same in a chart as it does in a badge — a reader should never have
 * to relearn what amber means between two panels on one screen.
 */

const AXIS = { stroke: "var(--muted)", fontSize: 11 };
const GRID = "var(--border)";

function ChartCard({
  title,
  description,
  isEmpty,
  emptyLabel,
  children,
}: {
  title: string;
  description?: string;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {isEmpty ? (
        <EmptyState title={emptyLabel} description="Submit some reports and this will fill in." />
      ) : (
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** Shared tooltip styling so all four charts read as one system. */
const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    fontSize: "12px",
    color: "var(--foreground)",
  },
  labelStyle: { color: "var(--muted)", fontSize: "11px" },
};

export function TasksTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  const points = data.map((point) => ({
    ...point,
    label: format(parseISO(point.weekStart), "d MMM"),
  }));

  return (
    <ChartCard
      title="Tasks completed over time"
      description="Team-wide, by week"
      isEmpty={points.length === 0}
      emptyLabel="No completed tasks yet"
    >
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="completedTasks"
          name="Completed"
          stroke="#4f46e5"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="totalTasks"
          name="Total"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </LineChart>
    </ChartCard>
  );
}

export function WorkloadChart({ data }: { data: ProjectWorkload[] }) {
  return (
    <ChartCard
      title="Workload by project"
      description="Hours logged against each project"
      isEmpty={data.length === 0}
      emptyLabel="No project work recorded yet"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="projectName"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
          // Project names are long; truncate rather than let them overlap.
          tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(value) => hours(Number(value))} />
        <Bar dataKey="hoursSpent" name="Hours" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.projectId} fill={entry.projectColor ?? "#4f46e5"} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

export function TimeSplitChart({ data }: { data: TaskTypeHours[] }) {
  const slices = data
    .filter((entry) => Number(entry.hours) > 0)
    .map((entry) => ({
      name: TASK_TYPE_LABEL[entry.taskType],
      value: Number(entry.hours),
      fill: TASK_TYPE_COLOR[entry.taskType],
    }));

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ChartCard
      title="Time by task type"
      description={total > 0 ? `${hours(total)} logged team-wide` : undefined}
      isEmpty={slices.length === 0}
      emptyLabel="No hours logged yet"
    >
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {slices.map((slice) => (
            <Cell key={slice.name} fill={slice.fill} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value) => hours(Number(value))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ChartCard>
  );
}

export function StatusByMemberChart({ data }: { data: MemberStatusBreakdown[] }) {
  // First names only: full names crowd the axis and the team is small enough
  // for them to stay unambiguous.
  const rows = data.map((row) => ({ ...row, short: row.userName.split(" ")[0] }));

  return (
    <ChartCard
      title="Report status by team member"
      description="Across the selected period"
      isEmpty={rows.length === 0}
      emptyLabel="No reports in this period"
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="short" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="approved" name="Approved" stackId="s" fill={STATUS_CHART_COLOR.APPROVED} />
        <Bar
          dataKey="needsCorrection"
          name="Needs correction"
          stackId="s"
          fill={STATUS_CHART_COLOR.NEEDS_CORRECTION}
        />
        <Bar
          dataKey="submitted"
          name="Awaiting review"
          stackId="s"
          fill={STATUS_CHART_COLOR.SUBMITTED}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartCard>
  );
}

/** Small inline trend for a single member's profile page. */
export function MemberTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
  const points = data.map((point) => ({
    ...point,
    label: weekRangeLabel(point.weekStart, point.weekStart),
    short: format(parseISO(point.weekStart), "d MMM"),
  }));

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No completed tasks yet.</p>;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="short" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="completedTasks"
            name="Completed tasks"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
