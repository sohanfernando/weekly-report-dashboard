"use client";

import { Plus, UserRoundX, Users } from "lucide-react";
import { useState } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { Reveal } from "@/components/motion/Reveal";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Loading,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { shortDate } from "@/lib/format";
import {
  useCreateUser,
  useMe,
  useRemoveUser,
  useUpdateUserRole,
  useUpdateUserStatus,
  useUsers,
  type UserFilters,
} from "@/lib/queries";
import type { Role } from "@/lib/types";

/** User management (Section 7): invite members, assign roles, deactivate. */
export default function UsersPage() {
  const { data: me } = useMe();
  const [filters, setFilters] = useState<UserFilters>({ page: 0, size: 20 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useUsers(filters);
  const createUser = useCreateUser();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const removeUser = useRemoveUser();

  function update(patch: Partial<UserFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 0 }));
  }

  function handleError(err: unknown) {
    setError(err instanceof ApiError ? err.message : "Something went wrong.");
  }

  return (
    <>
      <PageHeader
        title="User management"
        description="Who can sign in, and what they are allowed to do."
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setError(null);
            }}
          >
            <Plus className="size-4" /> Add user
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <Collapse open={creating}>
        <div className="mb-5">
          <NewUserForm
            saving={createUser.isPending}
            onCancel={() => setCreating(false)}
            onSave={(values) => {
              setError(null);
              createUser.mutate(values, {
                onSuccess: () => setCreating(false),
                onError: handleError,
              });
            }}
          />
        </div>
      </Collapse>

      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="Search" className="w-56">
          <Input
            placeholder="Name or email"
            value={filters.search ?? ""}
            onChange={(event) => update({ search: event.target.value })}
          />
        </Field>
        <Field label="Role" className="w-40">
          <Select
            value={filters.role ?? ""}
            onChange={(event) => update({ role: event.target.value as Role | "" })}
          >
            <option value="">All roles</option>
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
          </Select>
        </Field>
        <Field label="Status" className="w-40">
          <Select
            value={filters.active === undefined || filters.active === "" ? "" : String(filters.active)}
            onChange={(event) =>
              update({ active: event.target.value === "" ? "" : event.target.value === "true" })
            }
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
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
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Job title</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th />
                </tr>
              </thead>
              <Reveal as="tbody" stagger="tr" deps={[data.page, data.content.length]}>
                {data.content.map((user) => {
                  const isSelf = user.id === me?.id;
                  return (
                    <tr key={user.id} className="transition hover:bg-surface-muted/50">
                      <Td className="font-medium text-primary">
                        {user.name}
                        {isSelf && <span className="ml-2 text-xs text-secondary">(you)</span>}
                      </Td>
                      <Td className="text-secondary">{user.email}</Td>
                      <Td className="text-secondary">{user.jobTitle ?? "—"}</Td>
                      <Td className="w-36">
                        <Select
                          className="h-8 text-xs"
                          value={user.role}
                          /* Changing your own role is refused by the API, so do
                             not offer it and invite a 409. Only the row being
                             changed locks — isPending alone would freeze every
                             dropdown on the page. */
                          disabled={
                            isSelf ||
                            (updateRole.isPending && updateRole.variables?.id === user.id)
                          }
                          onChange={(event) => {
                            setError(null);
                            updateRole.mutate(
                              { id: user.id, role: event.target.value as Role },
                              { onError: handleError },
                            );
                          }}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                        </Select>
                      </Td>
                      <Td>
                        <span
                          className={
                            user.active ? "text-status-approved" : "text-secondary"
                          }
                        >
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </Td>
                      <Td className="text-secondary">{shortDate(user.createdAt)}</Td>
                      <Td className="text-right">
                        {!isSelf && (
                          <span className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              loading={
                                updateStatus.isPending && updateStatus.variables?.id === user.id
                              }
                              onClick={() => {
                                setError(null);
                                updateStatus.mutate(
                                  { id: user.id, active: !user.active },
                                  { onError: handleError },
                                );
                              }}
                            >
                              {user.active ? "Deactivate" : "Reactivate"}
                            </Button>
                            {user.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-status-missing"
                                title="Remove from the team"
                                loading={removeUser.isPending && removeUser.variables === user.id}
                                onClick={() => {
                                  setError(null);
                                  removeUser.mutate(user.id, { onError: handleError });
                                }}
                              >
                                <UserRoundX className="size-3.5" />
                              </Button>
                            )}
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Reveal>
            </Table>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <p className="text-secondary">
                  Page {data.page + 1} of {data.totalPages} · {data.totalElements} users
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
          <EmptyState icon={<Users className="size-8" />} title="No users match these filters" />
        )}
      </Card>

      <p className="mt-3 text-xs text-secondary">
        Removing someone deactivates their account rather than deleting it, so their past reports
        stay readable. The last active manager cannot be demoted or removed.
      </p>
    </>
  );
}

function NewUserForm({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: (values: {
    name: string;
    email: string;
    password: string;
    role: Role;
    jobTitle?: string;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [touched, setTouched] = useState(false);

  const nameError = touched && !name.trim() ? "Name is required" : undefined;
  const emailError = touched && !email.trim() ? "Email is required" : undefined;
  const passwordError =
    touched && password.length < 8 ? "Use at least 8 characters" : undefined;

  return (
    <Card>
      <CardHeader
        title="Add a team member"
        description="They can change their password after signing in."
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="new-name" error={nameError} required>
            <Input
              id="new-name"
              value={name}
              invalid={!!nameError}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="new-email" error={emailError} required>
            <Input
              id="new-email"
              type="email"
              value={email}
              invalid={!!emailError}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Job title" htmlFor="new-job">
            <Input
              id="new-job"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Backend Developer"
            />
          </Field>
          <Field label="Role" htmlFor="new-role">
            <Select
              id="new-role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              <option value="MEMBER">Member</option>
              <option value="MANAGER">Manager</option>
            </Select>
          </Field>
          <Field
            label="Temporary password"
            htmlFor="new-password"
            error={passwordError}
            required
            className="sm:col-span-2"
          >
            <Input
              id="new-password"
              type="text"
              value={password}
              invalid={!!passwordError}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              setTouched(true);
              if (!name.trim() || !email.trim() || password.length < 8) return;
              onSave({
                name: name.trim(),
                email: email.trim(),
                password,
                role,
                jobTitle: jobTitle.trim() || undefined,
              });
            }}
          >
            Create user
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
