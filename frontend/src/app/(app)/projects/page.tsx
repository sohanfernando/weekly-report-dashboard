"use client";

import { FolderKanban, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
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
import { shortDate } from "@/lib/format";
import {
  useDeleteProject,
  useMe,
  useProjects,
  useSaveProject,
} from "@/lib/queries";
import type { Project } from "@/lib/types";

const DEFAULT_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

/**
 * Project and category management (Section 5) — a full page with a list and
 * CRUD, rather than a modal, as the brief asks.
 */
export default function ProjectsPage() {
  const { data: me } = useMe();
  const isManager = me?.role === "MANAGER";

  const { data: projects, isPending } = useProjects(false);
  const saveProject = useSaveProject();
  const deleteProject = useDeleteProject();

  const [editing, setEditing] = useState<Project | "new" | null>(null);
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

      {editing && (
        <div className="mb-5">
          <ProjectEditor
            project={editing === "new" ? undefined : editing}
            saving={saveProject.isPending}
            onCancel={() => setEditing(null)}
            onSave={(values) => {
              setError(null);
              saveProject.mutate(
                { ...values, id: editing === "new" ? undefined : editing.id },
                {
                  onSuccess: () => setEditing(null),
                  onError: (err) =>
                    setError(err instanceof ApiError ? err.message : "Could not save the project."),
                },
              );
            }}
          />
        </div>
      )}

      <Card>
        {isPending ? (
          <Loading />
        ) : projects && projects.length > 0 ? (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Code</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                {isManager && <Th />}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="transition hover:bg-surface-muted/50">
                  <Td>
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: project.color ?? "#94a3b8" }}
                      />
                      {project.name}
                    </span>
                  </Td>
                  <Td>
                    <Badge>{project.code}</Badge>
                  </Td>
                  <Td className="max-w-md truncate text-muted">{project.description ?? "—"}</Td>
                  <Td>
                    <span
                      className={
                        project.active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted"
                      }
                    >
                      {project.active ? "Active" : "Archived"}
                    </span>
                  </Td>
                  <Td className="text-muted">{shortDate(project.createdAt)}</Td>
                  {isManager && (
                    <Td className="text-right">
                      {confirmDelete === project.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-xs text-muted">Delete?</span>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deleteProject.isPending}
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
                            className="text-rose-500"
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
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<FolderKanban className="size-8" />}
            title="No projects yet"
            description="Add one so reports can be tagged against it."
          />
        )}
      </Card>

      <p className="mt-3 text-xs text-muted">
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
  onSave: (values: {
    name: string;
    code: string;
    description: string | null;
    color: string | null;
    active: boolean;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [code, setCode] = useState(project?.code ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? DEFAULT_COLORS[0]);
  const [active, setActive] = useState(project?.active ?? true);
  const [touched, setTouched] = useState(false);

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
                    ? "size-7 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-[var(--surface)]"
                    : "size-7 rounded-full"
                }
              />
            ))}
          </div>
        </Field>

        {project && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="size-4 accent-[var(--brand)]"
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
              onSave({
                name: name.trim(),
                code: code.trim(),
                description: description.trim() || null,
                color,
                active,
              });
            }}
          >
            {project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
