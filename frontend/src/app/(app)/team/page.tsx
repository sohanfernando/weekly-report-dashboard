"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import {
  Card,
  EmptyState,
  Field,
  Input,
  Loading,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { mondayOf, relative } from "@/lib/format";
import { useSubmissions, useUsers } from "@/lib/queries";

/**
 * The team roster. Each member links through to their profile and full report
 * history, and this week's status is shown inline so a manager can see at a
 * glance who still owes a report.
 */
export default function TeamPage() {
  const [search, setSearch] = useState("");
  const week = mondayOf();

  const { data: members, isPending } = useUsers({
    role: "MEMBER",
    search,
    size: 100,
  });
  const { data: submissions } = useSubmissions(week);

  const stateByUser = new Map(submissions?.map((row) => [row.userId, row]) ?? []);

  return (
    <>
      <PageHeader title="Team" description="Everyone filing weekly reports." />

      <div className="mb-4 max-w-xs">
        <Field label="Search">
          <Input
            placeholder="Name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
      </div>

      <Card>
        {isPending ? (
          <Loading />
        ) : members && members.content.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th className="sm:max-md:hidden">Email</Th>
                <Th>This week</Th>
                <Th className="sm:max-md:hidden">Last submitted</Th>
                <Th />
              </tr>
            </thead>
            <Reveal as="tbody" stagger="tr" deps={[members.content.length]}>
              {members.content.map((member) => {
                const row = stateByUser.get(member.id);
                return (
                  <tr key={member.id} className="transition hover:bg-surface-muted/50">
                    <Td label="Name" className="font-medium text-primary">
                      {member.name}
                      {!member.active && (
                        <span className="ml-2 text-xs text-secondary">(inactive)</span>
                      )}
                    </Td>
                    <Td label="Role" className="text-secondary">{member.jobTitle ?? "—"}</Td>
                    <Td label="Email" className="text-secondary sm:max-md:hidden">
                      <span className="truncate">{member.email}</span>
                    </Td>
                    <Td label="This week">
                      {row ? <StatusBadge state={row.state} /> : <span className="text-secondary">—</span>}
                    </Td>
                    <Td label="Last submitted" className="text-secondary sm:max-md:hidden">
                      {row?.submittedAt ? relative(row.submittedAt) : "—"}
                    </Td>
                    <Td className="text-right">
                      <Link
                        href={`/team/${member.id}`}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        View profile
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </Reveal>
          </Table>
        ) : (
          <EmptyState
            icon={<Users className="size-8" />}
            title="No team members found"
            description={search ? "Try a different search." : "Add members from User management."}
          />
        )}
      </Card>
    </>
  );
}
