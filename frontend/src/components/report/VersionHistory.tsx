"use client";

import { ChevronDown, History } from "lucide-react";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { ReportView } from "@/components/report/ReportView";
import { cn } from "@/lib/cn";
import { dateTime } from "@/lib/format";
import type { ReportVersion } from "@/lib/types";

/**
 * Past versions of a week's report, expandable on demand.
 *
 * This is the visible half of the versioning requirement: a correction cycle
 * adds a snapshot rather than overwriting one, so a manager can read exactly
 * what they commented on next to what was resubmitted.
 */
export function VersionHistory({
  versions,
  currentVersionNo,
}: {
  versions: ReportVersion[];
  currentVersionNo: number | null;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  // Newest first, and the version in play is shown above this component already.
  const past = [...versions].sort((a, b) => b.versionNo - a.versionNo);

  if (past.length <= 1) {
    return (
      <Card>
        <CardHeader title="Version history" />
        <CardBody>
          <p className="text-sm text-muted">
            Only one version so far. A new one is created each time a manager sends the report back
            for correction.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Version history"
        description={`${past.length} versions. Earlier ones are kept exactly as they were reviewed.`}
      />
      <CardBody className="space-y-2">
        {past.map((version) => {
          const isCurrent = version.versionNo === currentVersionNo;
          const isOpen = expanded === version.versionNo;
          return (
            <div key={version.id} className="rounded-lg ring-1 ring-line">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : version.versionNo)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/60"
              >
                <History className="size-4 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Version {version.versionNo}
                    {isCurrent && <span className="ml-2 text-xs text-brand">current</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {version.submittedAt
                      ? `Submitted ${dateTime(version.submittedAt)}`
                      : "Not yet submitted"}
                    {" · "}
                    {version.tasks.length} task{version.tasks.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted transition", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <div className="border-t border-line bg-background/40 p-4">
                  <ReportView version={version} />
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
