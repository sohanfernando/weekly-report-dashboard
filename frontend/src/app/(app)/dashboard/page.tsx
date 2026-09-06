"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  StatusByMemberChart,
  TasksTrendChart,
  TimeSplitChart,
  WorkloadChart,
} from "@/components/charts";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Loading,
  PageHeader,
  Select,
  StatTile,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { dateTime, mondayOf, percent, relative, shiftWeeks, weekRangeLabel } from "@/lib/format";
import {
  useActivity,
  useDashboardSummary,
  useStatusByMember,
  useSubmissions,
  useTasksTrend,
  useTeamSection,
  useTimeByTaskType,
  useWorkloadByProject,
} from "@/lib/queries";
import type { ReportSection } from "@/lib/types";
import { addDays, format, parseISO } from "date-fns";

/** The manager dashboard: Sections 4 and 6 of the brief in one screen. */
export default function DashboardPage() {
  const [week, setWeek] = useState(mondayOf());
  const [section, setSection] = useState<ReportSection>("BLOCKERS");

  // Charts cover a trailing window rather than the selected week alone, so a
  // trend line has something to be a trend of.
  const range = { from: shiftWeeks(week, -7), to: week };

  const summary = useDashboardSummary(week);
  const submissions = useSubmissions(week);
  const trend = useTasksTrend(range);
  const workload = useWorkloadByProject(range);
  const timeSplit = useTimeByTaskType(range);
  const statusByMember = useStatusByMember(range);
  const activity = useActivity(0, 8);
  const teamSection = useTeamSection(section, week);

  const weekEnd = format(addDays(parseISO(week), 6), "yyyy-MM-dd");
  const isCurrentWeek = week === mondayOf();

  return (
    <>
      <PageHeader
        title="Team dashboard"
        description="How the team is tracking this week, and where the work is going."
        action={
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={() => setWeek(shiftWeeks(week, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-44 rounded-lg bg-surface px-3 py-1.5 text-center text-sm ring-1 ring-line">
              {weekRangeLabel(week, weekEnd)}
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={isCurrentWeek}
              onClick={() => setWeek(shiftWeeks(week, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            {!isCurrentWeek && (
              <Button variant="ghost" size="sm" onClick={() => setWeek(mondayOf())}>
                This week
              </Button>
            )}
          </div>
        }
      />

      {/* ------------------------------------------------- headline metrics */}
      {summary.isPending ? (
        <Loading />
      ) : summary.data ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Reports submitted"
            value={`${summary.data.submitted} / ${summary.data.expectedMembers}`}
            hint={`${summary.data.awaitingReview} awaiting review`}
          />
          <StatTile
            label="Submission compliance"
            value={percent(summary.data.complianceRate)}
            hint={
              summary.data.weekClosed
                ? `${summary.data.late} late`
                : `${summary.data.pending} still pending`
            }
            tone={summary.data.complianceRate >= 80 ? "success" : "warning"}
          />
          <StatTile
            label="Needs correction"
            value={summary.data.needsCorrection}
            hint="Sent back for changes"
            tone={summary.data.needsCorrection > 0 ? "warning" : "default"}
          />
          <StatTile
            label="Open blockers"
            value={summary.data.openBlockers}
            hint="Unresolved across the team"
            tone={summary.data.openBlockers > 0 ? "danger" : "success"}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------ submission status */}
      <Card className="mb-6">
        <CardHeader
          title="Who has filed this week"
          description="Members with no report at all show as not started."
        />
        {submissions.isPending ? (
          <Loading />
        ) : submissions.data && submissions.data.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Team member</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Version</Th>
                <Th>Submitted</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {submissions.data.map((row) => (
                <tr key={row.userId} className="transition hover:bg-surface-muted/50">
                  <Td className="font-medium text-foreground">{row.userName}</Td>
                  <Td className="text-muted">{row.jobTitle ?? "—"}</Td>
                  <Td>
                    <StatusBadge state={row.state} />
                  </Td>
                  <Td className="tabular-nums text-muted">
                    {row.versionNo ? `v${row.versionNo}` : "—"}
                  </Td>
                  <Td className="text-muted">{row.submittedAt ? relative(row.submittedAt) : "—"}</Td>
                  <Td className="text-right">
                    {row.reportId ? (
                      <Link
                        href={
                          row.state === "SUBMITTED"
                            ? `/review/${row.reportId}`
                            : `/reports/${row.reportId}`
                        }
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        {row.state === "SUBMITTED" ? "Review" : "Open"}
                      </Link>
                    ) : (
                      <Link
                        href={`/team/${row.userId}`}
                        className="text-sm text-muted hover:underline"
                      >
                        Profile
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No active team members" />
        )}
      </Card>

      {/* ------------------------------------------------------- the charts */}
      <div className="mb-6 grid gap-5 xl:grid-cols-2">
        {trend.isPending ? <Loading /> : <TasksTrendChart data={trend.data ?? []} />}
        {timeSplit.isPending ? <Loading /> : <TimeSplitChart data={timeSplit.data ?? []} />}
        {workload.isPending ? <Loading /> : <WorkloadChart data={workload.data ?? []} />}
        {statusByMember.isPending ? (
          <Loading />
        ) : (
          <StatusByMemberChart data={statusByMember.data ?? []} />
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* --------------------------------- one section across the team */}
        <Card>
          <CardHeader
            title="Across the team"
            description="Read one section for everyone, without opening each report."
            action={
              <Select
                value={section}
                onChange={(event) => setSection(event.target.value as ReportSection)}
                className="w-40"
              >
                <option value="BLOCKERS">Blockers</option>
                <option value="ACHIEVEMENTS">Achievements</option>
              </Select>
            }
          />
          <CardBody className="space-y-3">
            {teamSection.isPending ? (
              <Loading />
            ) : teamSection.data && teamSection.data.length > 0 ? (
              teamSection.data.map((item) => (
                <div key={item.userId} className="rounded-lg bg-surface-muted/50 p-3 ring-1 ring-line">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.userName}</p>
                    <Link
                      href={`/reports/${item.reportId}`}
                      className="text-xs text-brand hover:underline"
                    >
                      Open report
                    </Link>
                  </div>
                  {item.entries.length === 0 ? (
                    <p className="text-sm text-muted">Nothing reported.</p>
                  ) : (
                    <ul className="space-y-1">
                      {item.entries.map((entry, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                          <span
                            className={
                              entry.key
                                ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
                                : "mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-400"
                            }
                          />
                          <span className={entry.resolved ? "text-muted line-through" : undefined}>
                            {entry.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            ) : (
              <EmptyState title="Nothing submitted for this week yet" />
            )}
          </CardBody>
        </Card>

        {/* ------------------------------------------------ activity feed */}
        <Card>
          <CardHeader title="Recent review activity" description="Approvals and correction requests" />
          <CardBody className="space-y-3">
            {activity.isPending ? (
              <Loading />
            ) : activity.data && activity.data.content.length > 0 ? (
              activity.data.content.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <span
                    className={
                      item.action === "APPROVE"
                        ? "mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"
                        : "mt-1.5 size-2 shrink-0 rounded-full bg-amber-500"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.reviewerName}</span>{" "}
                      {item.action === "APPROVE" ? "approved" : "requested changes on"}{" "}
                      <Link href={`/reports/${item.reportId}`} className="text-brand hover:underline">
                        {item.memberName}
                      </Link>
                      &apos;s report
                    </p>
                    {item.comment && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.comment}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted">
                      v{item.versionNo} · {dateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No review activity yet" />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
