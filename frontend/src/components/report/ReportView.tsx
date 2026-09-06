"use client";

import { AlertTriangle, CheckCircle2, Star } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, Table, Td, Th } from "@/components/ui";
import { cn } from "@/lib/cn";
import { TASK_STATUS_LABEL, TASK_TYPE_COLOR, TASK_TYPE_LABEL, hours, humanise } from "@/lib/format";
import type { ReportVersion } from "@/lib/types";

/** Read-only rendering of one report version, shared by the detail and review pages. */
export function ReportView({ version }: { version: ReportVersion }) {
  const totalPlanned = version.tasks.reduce((sum, t) => sum + Number(t.hoursPlanned), 0);
  const totalSpent = version.tasks.reduce((sum, t) => sum + Number(t.hoursSpent), 0);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Tasks completed"
          description={`${version.tasks.length} task${version.tasks.length === 1 ? "" : "s"} · ${hours(totalSpent)} spent against ${hours(totalPlanned)} planned`}
        />
        {version.tasks.length === 0 ? (
          <CardBody>
            <p className="text-sm text-secondary">No tasks recorded.</p>
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th className="text-right">Planned</Th>
                <Th className="text-right">Actual</Th>
                <Th className="text-right">Hours</Th>
                <Th>Deliverable</Th>
              </tr>
            </thead>
            <tbody>
              {version.tasks.map((task, index) => (
                <tr key={task.id ?? index}>
                  <Td className="font-medium text-primary">{task.name}</Td>
                  <Td>
                    <PriorityPill priority={task.priority} />
                  </Td>
                  <Td className="text-secondary">{TASK_STATUS_LABEL[task.status]}</Td>
                  <Td className="text-right tabular-nums text-secondary">{task.plannedPct}%</Td>
                  <Td className="text-right tabular-nums">
                    <span
                      className={cn(
                        // On or above plan reads as approved-green; behind plan
                        // borrows the correction amber, the same signal the
                        // review workflow uses for "needs attention".
                        task.actualPct >= task.plannedPct
                          ? "text-status-approved"
                          : "text-status-correction",
                      )}
                    >
                      {task.actualPct}%
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums text-secondary">
                    {hours(Number(task.hoursSpent))} / {hours(Number(task.hoursPlanned))}
                  </Td>
                  <Td className="text-secondary">{task.deliverable || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {version.nextWeekPlan && (
        <Card>
          <CardHeader title="Planned for next week" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-primary">{version.nextWeekPlan}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <NoteList
          title="Blockers and challenges"
          empty="No blockers reported."
          items={version.blockers}
          keyIcon={<AlertTriangle className="size-3.5" />}
          keyLabel="Key issue"
          tone="correction"
          showResolved
        />
        <NoteList
          title="Achievements and highlights"
          empty="No achievements reported."
          items={version.achievements}
          keyIcon={<Star className="size-3.5" />}
          keyLabel="Key achievement"
          tone="approved"
        />
      </div>

      {version.hours.length > 0 && (
        <Card>
          <CardHeader title="Hours by task type" />
          <CardBody className="flex flex-wrap gap-2">
            {version.hours.map((entry) => (
              <Badge key={entry.taskType} color={TASK_TYPE_COLOR[entry.taskType]}>
                {TASK_TYPE_LABEL[entry.taskType]} · {hours(Number(entry.hours))}
              </Badge>
            ))}
          </CardBody>
        </Card>
      )}

      {(version.notes || version.links) && (
        <Card>
          <CardHeader title="Notes and links" />
          <CardBody className="space-y-3">
            {version.notes && (
              <p className="whitespace-pre-wrap text-sm text-primary">{version.notes}</p>
            )}
            {version.links && (
              <div className="space-y-1">
                {version.links
                  .split(/[\n,]/)
                  .map((link) => link.trim())
                  .filter(Boolean)
                  .map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-mono text-xs text-brand hover:underline"
                    >
                      {link}
                    </a>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  // Priority escalates through the system palette: neutral, informational,
  // attention, urgent — the same four hues the status badges use.
  const styles: Record<string, string> = {
    LOW: "bg-status-draft/10 text-status-draft",
    MEDIUM: "bg-status-submitted/10 text-status-submitted",
    HIGH: "bg-status-correction/10 text-status-correction",
    CRITICAL: "bg-status-missing/10 text-status-missing",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[priority])}>
      {humanise(priority)}
    </span>
  );
}

function NoteList({
  title,
  empty,
  items,
  keyIcon,
  keyLabel,
  tone,
  showResolved = false,
}: {
  title: string;
  empty: string;
  items: { id: number | null; description: string; key: boolean; resolved: boolean }[];
  keyIcon: React.ReactNode;
  keyLabel: string;
  tone: "correction" | "approved";
  showResolved?: boolean;
}) {
  const toneClass =
    tone === "correction"
      ? "bg-status-correction/10 text-status-correction ring-status-correction/25"
      : "bg-status-approved/10 text-status-approved ring-status-approved/25";

  // The key item first: it is the one thing the manager should read.
  const ordered = [...items].sort((a, b) => Number(b.key) - Number(a.key));

  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-2">
        {ordered.length === 0 && <p className="text-sm text-secondary">{empty}</p>}
        {ordered.map((item, index) => (
          <div
            key={item.id ?? index}
            className={cn(
              "rounded-lg px-3 py-2 text-sm ring-1 ring-inset",
              item.key ? toneClass : "bg-surface-muted/60 text-primary ring-border",
            )}
          >
            <div className="flex items-start gap-2">
              {item.key && <span className="mt-0.5 shrink-0">{keyIcon}</span>}
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {item.key && <span className="text-xs font-medium">{keyLabel}</span>}
                  {showResolved && item.resolved && (
                    <span className="inline-flex items-center gap-1 text-xs text-status-approved">
                      <CheckCircle2 className="size-3" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
