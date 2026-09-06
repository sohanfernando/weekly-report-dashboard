"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MemberTrendChart } from "@/components/charts";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Loading,
  StatTile,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { hours, mondayOf, percent, relative, shiftWeeks, weekRangeLabel } from "@/lib/format";
import { useMemberStats, useTasksTrend, useTeamReports } from "@/lib/queries";

/**
 * A team member's profile as a manager sees it: headline stats, their trend,
 * and their full report history (Section 7).
 */
export default function MemberProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const stats = useMemberStats(userId);
  const reports = useTeamReports({ userId, size: 50 });
  const trend = useTasksTrend({ from: shiftWeeks(mondayOf(), -11), to: mondayOf(), userId });

  if (stats.isPending) return <Loading label="Loading profile" />;

  if (stats.error || !stats.data) {
    return (
      <Card>
        <EmptyState
          title="Could not load this profile"
          action={
            <Link href="/team">
              <Button variant="secondary" size="sm">
                Back to the team
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const { member } = stats.data;

  return (
    <>
      <div className="mb-5">
        <Link
          href="/team"
          className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-4" /> Team
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">{member.name}</h1>
        <p className="mt-1 text-sm text-secondary">
          {member.jobTitle ?? "Team member"} · {member.email}
          {!member.active && " · inactive"}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Reports filed"
          value={stats.data.totalReports}
          hint={`${stats.data.drafts} still a draft`}
        />
        <StatTile
          label="Approval rate"
          value={percent(stats.data.approvalRate)}
          hint={`${stats.data.approved} approved`}
          tone={stats.data.approvalRate >= 80 ? "success" : "warning"}
        />
        <StatTile
          label="Tasks completed"
          value={`${stats.data.completedTasks} / ${stats.data.totalTasks}`}
          hint="Across all submitted reports"
        />
        <StatTile
          label="Hours logged"
          value={hours(Number(stats.data.hoursSpent))}
          hint={
            stats.data.needsCorrection > 0
              ? `${stats.data.needsCorrection} awaiting correction`
              : `${stats.data.awaitingReview} awaiting review`
          }
        />
      </div>

      <Card className="mb-6">
        <CardHeader title="Tasks completed over time" description="Last twelve weeks" />
        <CardBody>
          {trend.isPending ? <Loading /> : <MemberTrendChart data={trend.data ?? []} />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Report history"
          description="Drafts are not shown — they are private to their author."
        />
        {reports.isPending ? (
          <Loading />
        ) : reports.data && reports.data.content.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Week</Th>
                <Th>Project</Th>
                <Th>Status</Th>
                <Th>Version</Th>
                <Th>Submitted</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {reports.data.content.map((report) => (
                <tr key={report.id} className="transition hover:bg-surface-muted/50">
                  <Td className="font-medium text-primary">
                    {weekRangeLabel(report.weekStart, report.weekEnd)}
                  </Td>
                  <Td className="text-secondary">{report.projectName ?? "—"}</Td>
                  <Td>
                    <StatusBadge state={report.status} />
                  </Td>
                  <Td className="tabular-nums text-secondary">v{report.currentVersionNo ?? 1}</Td>
                  <Td className="text-secondary">{relative(report.submittedAt)}</Td>
                  <Td className="text-right">
                    <Link
                      href={
                        report.status === "SUBMITTED"
                          ? `/review/${report.id}`
                          : `/reports/${report.id}`
                      }
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      {report.status === "SUBMITTED" ? "Review" : "View"}
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No submitted reports yet" />
        )}
      </Card>
    </>
  );
}
