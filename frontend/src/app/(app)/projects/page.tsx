"use client";

import { FolderKanban, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Collapse } from "@/components/motion/Collapse";
import { Reveal } from "@/components/motion/Reveal";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Loading,
  PageHeader,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { CHART_SERIES, shortDate } from "@/lib/format";
import {
  useAssignProjectMembers,
  useDeleteProject,
  useMe,
  useProject,
  useProjects,
  useSaveProject,
  useUsers,
} from "@/lib/queries";
import type { Project } from "@/lib/types";

/** The chart series palette, so a project's colour is always one the charts use. */
const DEFAULT_COLORS = [...CHART_SERIES];

/**
 * Project and category management (Section 5) — a full page with a list and
 * CRUD, rather than a modal, as the brief asks.
 */
export default function ProjectsPage() {
  const { data: me } = useMe();
  const isManager = me?.role === "MANAGER";

  const { data: projects, isPending } = useProjects(false);
  const saveProject = useSaveProject();
  const assignMembers = useAssignProjectMembers();
  const deleteProject = useDeleteProject();

  const [editing, setEditing] = useState<Project | "new" | null>(null);
  // The editor has to keep rendering while it animates shut, by which point
  // `editing` is already null. Remembering the last target keeps the closing
  // panel showing what it was showing rather than collapsing an empty box.
  // Held in state, not a ref: this is read during render, and a ref read at
  // render time is not guaranteed to be the value React renders with.
  const [lastEditing, setLastEditing] = useState<Project | "new" | null>(null);
  if (editing && editing !== lastEditing) setLastEditing(editing);
  const editorTarget = editing ?? lastEditing;
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        title="Projects and categories"
        description="What work gets tagged against on a weekly report."
        action={
          isManager && (
            <Button
              onClick={() => {
                setEditing("new");
                setError(null);
              }}
            >
              <Plus className="size-4" /> Add project
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <Collapse open={!!editing}>
        {editorTarget && (
          <div className="mb-5">
            <ProjectEditor
              key={editorTarget === "new" ? "new" : editorTarget.id}
              project={editorTarget === "new" ? undefined : editorTarget}
              saving={saveProject.isPending || assignMembers.isPending}
              onCancel={() => setEditing(null)}
              onSave={(values, memberIds) => {
                setError(null);
                const fail = (err: unknown) =>
                  setError(err instanceof ApiError ? err.message : "Could not save the project.");

                // Membership is a separate endpoint, and a new project has no id
                // until it exists — so it is assigned after the save returns.
                saveProject.mutate(
                  { ...values, id: editorTarget === "new" ? undefined : editorTarget.id },
                  {
                    onSuccess: (saved) =>
                      assignMembers.mutate(
                        { id: saved.id, userIds: memberIds },
                        { onSuccess: () => setEditing(null), onError: fail },
                      ),
                    onError: fail,
                  },
                );
              }}
            />
          </div>
        )}
      </Collapse>

      <Card>
        {isPending ? (
          <Loading />
        ) : projects && projects.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Code</Th>
                <Th className="sm:max-md:hidden">Description</Th>
                <Th className="sm:max-md:hidden">Members</Th>
                <Th>Status</Th>
                <Th className="sm:max-md:hidden">Created</Th>
                {isManager && <Th />}
              </tr>
            </thead>
            <Reveal as="tbody" stagger="tr" deps={[projects.length]}>
              {projects.map((project) => (
                <tr key={project.id} className="transition hover:bg-surface-muted/50">
                  <Td label="Project">
                    <span className="inline-flex items-center gap-2 font-medium text-primary">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: project.color ?? "var(--color-status-draft)" }}
                      />
                      {project.name}
                    </span>
                  </Td>
                  <Td label="Code">
                    <Badge>{project.code}</Badge>
                  </Td>
                  <Td
                    label="Description"
                    className="text-secondary sm:max-md:hidden md:max-w-md md:truncate"
                  >
                    {project.description ?? "—"}
                  </Td>
                  <Td label="Members" className="text-secondary tabular-nums sm:max-md:hidden">
                    {project.memberCount > 0
                      ? `${project.memberCount} assigned`
                      : "Anyone"}
                  </Td>
                  <Td label="Status">
                    <span
                      className={
                        project.active ? "text-status-approved" : "text-secondary"
                      }
                    >
                      {project.active ? "Active" : "Archived"}
                    </span>
                  </Td>
                  <Td label="Created" className="text-secondary sm:max-md:hidden">
                    {shortDate(project.createdAt)}
                  </Td>
                  {isManager && (
                    <Td className="text-right">
                      {confirmDelete === project.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-secondary">Delete?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={
                              deleteProject.isPending &&
                              deleteProject.variables === project.id
                            }
                            onClick={() => {
                              setError(null);
                              deleteProject.mutate(project.id, {
                                onSuccess: () => setConfirmDelete(null),
                                onError: (err) => {
                                  setConfirmDelete(null);
                                  setError(
                                    err instanceof ApiError
                                      ? err.message
                                      : "Could not delete the project.",
                                  );
                                },
                              });
                            }}
                          >
                            Yes
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                            <X className="size-3.5" />
                          </Button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(project);
                              setError(null);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-status-missing"
                            onClick={() => setConfirmDelete(project.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </span>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
            </Reveal>
          </Table>
        ) : (
          <EmptyState
            icon={<FolderKanban className="size-8" />}
            title="No projects yet"
            description="Add one so reports can be tagged against it."
          />
        )}
      </Card>

      <p className="mt-3 text-xs text-secondary">
        A project that any report already references cannot be deleted — archive it instead, which
        hides it from new reports while keeping past ones readable.
      </p>
    </>
  );
}

function ProjectEditor({
  project,
  saving,
  onSave,
  onCancel,
}: {
  project?: Project;
  saving: boolean;
  onSave: (
    values: {
      name: string;
      code: string;
      description: string | null;
      color: string | null;
      active: boolean;
    },
    memberIds: number[],
  ) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [code, setCode] = useState(project?.code ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? DEFAULT_COLORS[0]);
  const [active, setActive] = useState(project?.active ?? true);
  const [touched, setTouched] = useState(false);

  // The list response carries only a count, so the current membership is read
  // from the detail endpoint when an existing project is opened.
  const detail = useProject(project?.id ?? Number.NaN);
  const { data: staff } = useUsers({ active: true, size: 100 });

  const [memberIds, setMemberIds] = useState<number[] | null>(null);
  const loadedIds = detail.data?.members?.map((m) => m.id) ?? [];
  // Null until the user touches it, so the loaded set shows through first.
  const selected = memberIds ?? loadedIds;

  const toggleMember = (id: number) =>
    setMemberIds(
      selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id],
    );

  const nameError = touched && !name.trim() ? "Name is required" : undefined;
  const codeError = touched && !code.trim() ? "Code is required" : undefined;

  return (
    <Card>
      <CardHeader
        title={project ? `Edit ${project.name}` : "New project"}
        description="The code is a short, stable identifier and must be unique."
      />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="project-name" error={nameError} required>
            <Input
              id="project-name"
              value={name}
              invalid={!!nameError}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field
            label="Code"
            htmlFor="project-code"
            error={codeError}
            hint="Letters, digits, hyphens"
            required
          >
            <Input
              id="project-code"
              value={code}
              invalid={!!codeError}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="CLIENT-A"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            className="min-h-16"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <Field label="Colour" hint="Used to keep the project consistent across every chart">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Use ${option}`}
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                className={
                  color === option
                    ? "size-7 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-[var(--color-surface)]"
                    : "size-7 rounded-full"
                }
              />
            ))}
          </div>
        </Field>

        <Field
          label="Team members"
          hint="Optional. Leave empty to keep the project available to everyone."
        >
          <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
            {!staff || staff.content.length === 0 ? (
              <p className="px-3 py-2 text-sm text-secondary">No active users.</p>
            ) : (
              staff.content.map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 text-sm last:border-b-0 hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-brand)]"
                    checked={selected.includes(person.id)}
                    onChange={() => toggleMember(person.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-primary">{person.name}</span>
                  <span className="shrink-0 text-xs text-secondary">
                    {person.jobTitle ?? (person.role === "MANAGER" ? "Manager" : "Member")}
                  </span>
                </label>
              ))
            )}
          </div>
        </Field>

        {project && (
          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-[var(--color-brand)]"
            />
            Active — offered when tagging a new report
          </label>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              setTouched(true);
              if (!name.trim() || !code.trim()) return;
              onSave(
                {
                  name: name.trim(),
                  code: code.trim(),
                  description: description.trim() || null,
                  color,
                  active,
                },
                selected,
              );
            }}
          >
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
