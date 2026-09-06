"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Loading,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { relative, weekRangeLabel } from "@/lib/format";
import { useProjects, useTeamReports, useUsers, type TeamReportFilters } from "@/lib/queries";
import type { ReportStatus } from "@/lib/types";

const STATUSES: ReportStatus[] = ["SUBMITTED", "NEEDS_CORRECTION", "APPROVED"];

/**
 * The review queue: every report waiting on a manager, with the filters the
 * brief asks for. Defaults to SUBMITTED, because that is the work.
 */
export default function ReviewQueuePage() {
  const [filters, setFilters] = useState<TeamReportFilters>({
    status: "SUBMITTED",
    page: 0,
    size: 20,
  });

  const { data, isPending } = useTeamReports(filters);
  const { data: projects } = useProjects(false);
  const { data: members } = useUsers({ role: "MEMBER", active: true, size: 100 });

  function update(patch: Partial<TeamReportFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 0 }));
  }

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Reports the team has submitted for your review."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="Status" className="w-48">
          <Select
            value={filters.status ?? ""}
            onChange={(event) => update({ status: event.target.value as ReportStatus | "" })}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "SUBMITTED"
                  ? "Awaiting review"
                  : status === "NEEDS_CORRECTION"
                    ? "Needs correction"
                    : "Approved"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Team member" className="w-52">
          <Select
            value={filters.userId ?? ""}
            onChange={(event) =>
              update({ userId: event.target.value ? Number(event.target.value) : "" })
            }
          >
            <option value="">Everyone</option>
            {members?.content.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Project" className="w-52">
          <Select
            value={filters.projectId ?? ""}
            onChange={(event) =>
              update({ projectId: event.target.value ? Number(event.target.value) : "" })
            }
          >
            <option value="">All projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Week starting" className="w-44">
          <input
            type="date"
            value={filters.weekStart ?? ""}
            onChange={(event) => update({ weekStart: event.target.value })}
            className="w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand"
          />
        </Field>

        <Field label="From" className="w-40">
          <input
            type="date"
            value={filters.from ?? ""}
            onChange={(event) => update({ from: event.target.value })}
            className="w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand"
          />
        </Field>

        <Field label="To" className="w-40">
          <input
            type="date"
            value={filters.to ?? ""}
            onChange={(event) => update({ to: event.target.value })}
            className="w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-border focus:ring-2 focus:ring-brand"
          />
        </Field>
      </div>

      <Card>
        {isPending ? (
          <Loading />
        ) : data && data.content.length > 0 ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Team member</Th>
                  <Th>Week</Th>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th>Version</Th>
                  <Th>Submitted</Th>
                  <Th />
                </tr>
              </thead>
              <Reveal as="tbody" stagger="tr" deps={[data.page, data.content.length]}>
                {data.content.map((report) => (
                  <tr key={report.id} className="transition hover:bg-surface-muted/50">
                    <Td className="font-medium text-primary">
                      <Link href={`/team/${report.userId}`} className="hover:underline">
                        {report.userName}
                      </Link>
                    </Td>
                    <Td>{weekRangeLabel(report.weekStart, report.weekEnd)}</Td>
                    <Td>
                      {report.projectName ? (
                        <span className="inline-flex items-center gap-1.5 text-secondary">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: report.projectColor ?? "var(--color-status-draft)" }}
                          />
                          {report.projectName}
                        </span>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </Td>
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
              </Reveal>
            </Table>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <p className="text-secondary">
                  Page {data.page + 1} of {data.totalPages} · {data.totalElements} reports
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.first}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={data.last}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<CheckCircle2 className="size-8" />}
            title={
              filters.status === "SUBMITTED"
                ? "Nothing waiting on you"
                : "No reports match these filters"
            }
            description={
              filters.status === "SUBMITTED"
                ? "Every submitted report has been reviewed."
                : "Try widening the filters."
            }
          />
        )}
      </Card>
    </>
  );
}
