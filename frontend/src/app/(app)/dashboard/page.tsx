"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal } from "@/components/motion/Reveal";
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
            <div className="min-w-44 rounded-lg bg-surface px-3 py-1.5 text-center text-sm ring-1 ring-border">
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
        <Reveal
          stagger="[data-stat]"
          deps={[week, summary.data.submitted, summary.data.complianceRate]}
          className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {/* Counting these is not decoration: change the selected week and a
              figure that climbs from 40 to 60 reports that it changed, where
              one that simply swaps does not. */}
          <div data-stat>
            <StatTile
              label="Reports submitted"
              value={
                <>
                  <AnimatedNumber value={summary.data.submitted} /> / {summary.data.expectedMembers}
                </>
              }
              hint={`${summary.data.awaitingReview} awaiting review`}
            />
          </div>
          <div data-stat>
            <StatTile
              label="Submission compliance"
              value={<AnimatedNumber value={summary.data.complianceRate} format={percent} />}
              hint={
                summary.data.weekClosed
                  ? `${summary.data.late} late`
                  : `${summary.data.pending} still pending`
              }
              tone={summary.data.complianceRate >= 80 ? "success" : "warning"}
            />
          </div>
          <div data-stat>
            <StatTile
              label="Needs correction"
              value={<AnimatedNumber value={summary.data.needsCorrection} />}
              hint="Sent back for changes"
              tone={summary.data.needsCorrection > 0 ? "warning" : "default"}
            />
          </div>
          <div data-stat>
            <StatTile
              label="Open blockers"
              value={<AnimatedNumber value={summary.data.openBlockers} />}
              hint="Unresolved across the team"
              tone={summary.data.openBlockers > 0 ? "danger" : "success"}
            />
          </div>
        </Reveal>
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
                <Th className="sm:max-md:hidden">Role</Th>
                <Th>Status</Th>
                <Th className="sm:max-md:hidden">Version</Th>
                <Th>Submitted</Th>
                <Th />
              </tr>
            </thead>
            <Reveal as="tbody" stagger="tr" deps={[week, submissions.data.length]}>
              {submissions.data.map((row) => (
                <tr key={row.userId} className="transition hover:bg-surface-muted/50">
                  <Td label="Team member" className="font-medium text-primary">{row.userName}</Td>
                  <Td label="Role" className="text-secondary sm:max-md:hidden">{row.jobTitle ?? "—"}</Td>
                  <Td label="Status">
                    <StatusBadge state={row.state} />
                  </Td>
                  <Td label="Version" className="tabular-nums text-secondary sm:max-md:hidden">
                    {row.versionNo ? `v${row.versionNo}` : "—"}
                  </Td>
                  <Td label="Submitted" className="text-secondary">
                    {row.submittedAt ? relative(row.submittedAt) : "—"}
                  </Td>
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
                        className="text-sm text-secondary hover:underline"
                      >
                        Profile
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </Reveal>
          </Table>
        ) : (
          <EmptyState title="No active team members" />
        )}
      </Card>

      {/* ------------------------------------------------------- the charts */}
      <Reveal
        stagger="[data-chart]"
        deps={[week, trend.isPending, workload.isPending]}
        delay={0.08}
        className="mb-6 grid gap-5 xl:grid-cols-2"
      >
        <div data-chart>
          {trend.isPending ? <Loading /> : <TasksTrendChart data={trend.data ?? []} />}
        </div>
        <div data-chart>
          {timeSplit.isPending ? <Loading /> : <TimeSplitChart data={timeSplit.data ?? []} />}
        </div>
        <div data-chart>
          {workload.isPending ? <Loading /> : <WorkloadChart data={workload.data ?? []} />}
        </div>
        <div data-chart>
          {statusByMember.isPending ? (
            <Loading />
          ) : (
            <StatusByMemberChart data={statusByMember.data ?? []} />
          )}
        </div>
      </Reveal>

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
                aria-label="Section to show across the team"
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
                <div key={item.userId} className="rounded-lg bg-surface-muted/50 p-3 ring-1 ring-border">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary">{item.userName}</p>
                    <Link
                      href={`/reports/${item.reportId}`}
                      className="text-xs text-brand hover:underline"
                    >
                      Open report
                    </Link>
                  </div>
                  {item.entries.length === 0 ? (
                    <p className="text-sm text-secondary">Nothing reported.</p>
                  ) : (
                    <ul className="space-y-1">
                      {item.entries.map((entry, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-primary">
                          <span
                            className={
                              entry.key
                                ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-status-correction"
                                : "mt-1.5 size-1.5 shrink-0 rounded-full bg-status-draft"
                            }
                          />
                          <span className={entry.resolved ? "text-secondary line-through" : undefined}>
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
                        ? "mt-1.5 size-2 shrink-0 rounded-full bg-status-approved"
                        : "mt-1.5 size-2 shrink-0 rounded-full bg-status-correction"
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-primary">
                      <span className="font-medium">{item.reviewerName}</span>{" "}
                      {item.action === "APPROVE" ? "approved" : "requested changes on"}{" "}
                      <Link href={`/reports/${item.reportId}`} className="text-brand hover:underline">
                        {item.memberName}
                      </Link>
                      &apos;s report
                    </p>
                    {item.comment && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-secondary">{item.comment}</p>
                    )}
                    <p className="mt-0.5 text-xs text-secondary">
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
