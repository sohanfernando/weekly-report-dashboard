"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { relative, shortDate, weekRangeLabel } from "@/lib/format";
import { useMyReports, useProjects, type ReportFilters } from "@/lib/queries";
import type { ReportStatus } from "@/lib/types";

const STATUSES: ReportStatus[] = ["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "APPROVED"];

/**
 * Report history for the signed-in member — a list view, separate from the
 * create/edit page, as Section 7 asks.
 */
export default function MyReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({ page: 0, size: 20 });
  const { data, isPending, isError } = useMyReports(filters);
  const { data: projects } = useProjects(false);

  function update(patch: Partial<ReportFilters>) {
    // Any filter change resets to the first page, or you can end up on page 4
    // of a two-page result.
    setFilters((current) => ({ ...current, ...patch, page: 0 }));
  }

  return (
    <>
      <PageHeader
        title="My reports"
        description="Every week you have filed, and where each one stands."
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Field label="Status" className="w-44">
            <Select
              value={filters.status ?? ""}
              onChange={(event) => update({ status: event.target.value as ReportStatus | "" })}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === "NEEDS_CORRECTION" ? "Needs correction" : status.charAt(0) + status.slice(1).toLowerCase()}
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

          <Field label="From" className="w-40">
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(event) => update({ from: event.target.value })}
              className="w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </Field>

          <Field label="To" className="w-40">
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(event) => update({ to: event.target.value })}
              className="w-full rounded-lg bg-surface px-3 py-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand"
            />
          </Field>
        </div>

        <Link href="/reports/new">
          <Button>
            <Plus className="size-4" /> New report
          </Button>
        </Link>
      </div>

      <Card>
        {isPending ? (
          <Loading />
        ) : isError ? (
          <EmptyState title="Could not load your reports" description="Try refreshing the page." />
        ) : data && data.content.length > 0 ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Week</Th>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th>Version</Th>
                  <Th>Submitted</Th>
                  <Th>Last updated</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {data.content.map((report) => (
                  <tr key={report.id} className="transition hover:bg-surface-muted/50">
                    <Td className="font-medium text-foreground">
                      {weekRangeLabel(report.weekStart, report.weekEnd)}
                    </Td>
                    <Td>
                      {report.projectName ? (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: report.projectColor ?? "#94a3b8" }}
                          />
                          {report.projectName}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge state={report.status} />
                    </Td>
                    <Td className="tabular-nums text-muted">v{report.currentVersionNo ?? 1}</Td>
                    <Td className="text-muted">{shortDate(report.submittedAt)}</Td>
                    <Td className="text-muted">{relative(report.updatedAt)}</Td>
                    <Td className="text-right">
                      <Link
                        href={`/reports/${report.id}`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        {report.status === "DRAFT" || report.status === "NEEDS_CORRECTION"
                          ? "Continue"
                          : "View"}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <p className="text-muted">
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
            icon={<ClipboardList className="size-8" />}
            title="No reports yet"
            description="Start this week's report and it will appear here."
            action={
              <Link href="/reports/new">
                <Button size="sm">
                  <Plus className="size-4" /> New report
                </Button>
              </Link>
            }
          />
        )}
      </Card>
    </>
  );
}
