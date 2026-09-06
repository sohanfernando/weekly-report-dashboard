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
            <p className="text-sm text-muted">No tasks recorded.</p>
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
                  <Td className="font-medium text-foreground">{task.name}</Td>
                  <Td>
                    <PriorityPill priority={task.priority} />
                  </Td>
                  <Td className="text-muted">{TASK_STATUS_LABEL[task.status]}</Td>
                  <Td className="text-right tabular-nums text-muted">{task.plannedPct}%</Td>
                  <Td className="text-right tabular-nums">
                    <span
                      className={cn(
                        task.actualPct >= task.plannedPct
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {task.actualPct}%
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums text-muted">
                    {hours(Number(task.hoursSpent))} / {hours(Number(task.hoursPlanned))}
                  </Td>
                  <Td className="text-muted">{task.deliverable || "—"}</Td>
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
            <p className="whitespace-pre-wrap text-sm text-foreground">{version.nextWeekPlan}</p>
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
          tone="amber"
          showResolved
        />
        <NoteList
          title="Achievements and highlights"
          empty="No achievements reported."
          items={version.achievements}
          keyIcon={<Star className="size-3.5" />}
          keyLabel="Key achievement"
          tone="emerald"
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
              <p className="whitespace-pre-wrap text-sm text-foreground">{version.notes}</p>
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
  const styles: Record<string, string> = {
    LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    MEDIUM: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    HIGH: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
    CRITICAL: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
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
  tone: "amber" | "emerald";
  showResolved?: boolean;
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
      : "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";

  // The key item first: it is the one thing the manager should read.
  const ordered = [...items].sort((a, b) => Number(b.key) - Number(a.key));

  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="space-y-2">
        {ordered.length === 0 && <p className="text-sm text-muted">{empty}</p>}
        {ordered.map((item, index) => (
          <div
            key={item.id ?? index}
            className={cn(
              "rounded-lg px-3 py-2 text-sm ring-1 ring-inset",
              item.key ? toneClass : "bg-surface-muted/60 text-foreground ring-line",
            )}
          >
            <div className="flex items-start gap-2">
              {item.key && <span className="mt-0.5 shrink-0">{keyIcon}</span>}
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap">{item.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {item.key && <span className="text-xs font-medium">{keyLabel}</span>}
                  {showResolved && item.resolved && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
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
