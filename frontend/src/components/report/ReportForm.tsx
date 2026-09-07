"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { ApiError } from "@/lib/api";
import { mondayOf, TASK_STATUS_LABEL, TASK_TYPE_LABEL, humanise, weekRangeLabel } from "@/lib/format";
import { useCreateReport, useProjects, useSubmitReport, useUpdateReport } from "@/lib/queries";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type ReportDetail,
  type SaveReportInput,
} from "@/lib/types";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

/**
 * The one weekly report form, used for both creating and editing.
 *
 * The field set is fixed and identical for every user, as the brief requires —
 * there is no mechanism here to add, rename or reorder a field.
 */

const taskSchema = z.object({
  name: z.string().min(1, "Task name is required").max(255),
  priority: z.enum(TASK_PRIORITIES),
  plannedPct: z.number({ message: "0–100" }).int().min(0, "0–100").max(100, "0–100"),
  actualPct: z.number({ message: "0–100" }).int().min(0, "0–100").max(100, "0–100"),
  status: z.enum(TASK_STATUSES),
  hoursPlanned: z.number({ message: "Required" }).min(0, "Cannot be negative").max(999.99),
  hoursSpent: z.number({ message: "Required" }).min(0, "Cannot be negative").max(999.99),
  deliverable: z.string().max(500).optional(),
});

const noteSchema = z.object({
  description: z.string().min(1, "Description is required").max(1000),
  key: z.boolean(),
  resolved: z.boolean().optional(),
});

const schema = z.object({
  weekStart: z.string().min(1, "Pick a week"),
  projectId: z.string(),
  tasks: z.array(taskSchema).min(1, "Add at least one task before submitting"),
  nextWeekPlan: z.string().max(2000).optional(),
  blockers: z.array(noteSchema),
  achievements: z.array(noteSchema),
  hours: z.array(z.object({ taskType: z.enum(TASK_TYPES), hours: z.number().min(0).max(999.99) })),
  notes: z.string().max(2000).optional(),
  links: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyTask = {
  name: "",
  priority: "MEDIUM" as const,
  plannedPct: 100,
  actualPct: 0,
  status: "IN_PROGRESS" as const,
  hoursPlanned: 0,
  hoursSpent: 0,
  deliverable: "",
};

function toFormValues(report?: ReportDetail, defaultWeek?: string): FormValues {
  const version = report?.currentVersion;
  return {
    weekStart: report?.weekStart ?? defaultWeek ?? mondayOf(),
    projectId: report?.projectId ? String(report.projectId) : "",
    tasks:
      version?.tasks.map((t) => ({
        name: t.name,
        priority: t.priority,
        plannedPct: t.plannedPct,
        actualPct: t.actualPct,
        status: t.status,
        hoursPlanned: Number(t.hoursPlanned),
        hoursSpent: Number(t.hoursSpent),
        deliverable: t.deliverable ?? "",
      })) ?? [emptyTask],
    nextWeekPlan: version?.nextWeekPlan ?? "",
    blockers:
      version?.blockers.map((b) => ({
        description: b.description,
        key: b.key,
        resolved: b.resolved,
      })) ?? [],
    achievements:
      version?.achievements.map((a) => ({ description: a.description, key: a.key })) ?? [],
    // Always render all five buckets so the form shape never varies per user.
    hours: TASK_TYPES.map((taskType) => ({
      taskType,
      hours: Number(version?.hours.find((h) => h.taskType === taskType)?.hours ?? 0),
    })),
    notes: version?.notes ?? "",
    links: version?.links ?? "",
  };
}

export function ReportForm({ report, defaultWeek }: { report?: ReportDetail; defaultWeek?: string }) {
  const router = useRouter();
  const isEdit = !!report;

  const { data: projects } = useProjects(true);
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const submitReport = useSubmitReport();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(report, defaultWeek),
  });

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = form;

  const tasks = useFieldArray({ control, name: "tasks" });
  const blockers = useFieldArray({ control, name: "blockers" });
  const achievements = useFieldArray({ control, name: "achievements" });

  // useWatch rather than form.watch(): it subscribes to just these fields and,
  // unlike watch(), returns a value the React Compiler can reason about.
  // The picker only offers projects this member may use. A report can still
  // reference one they have since been unassigned from, so that project is kept
  // in the list — otherwise an unrelated edit would silently clear the tag.
  const available = projects ?? [];
  const orphanedCurrent =
    report?.projectId && !available.some((project) => project.id === report.projectId)
      ? [{ id: report.projectId, name: report.projectName ?? "Current project" }]
      : [];
  const projectOptions = [
    ...orphanedCurrent,
    ...available.map((project) => ({ id: project.id, name: project.name })),
  ];

  const weekStart = useWatch({ control, name: "weekStart" });
  const blockerValues = useWatch({ control, name: "blockers" });
  const achievementValues = useWatch({ control, name: "achievements" });
  const weekEnd = weekStart ? format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd") : null;

  const busy = createReport.isPending || updateReport.isPending || submitReport.isPending;

  /** Exactly one blocker or achievement may be the key item, so selecting one clears the rest. */
  function selectKey(field: "blockers" | "achievements", index: number) {
    // getValues, not a subscription: this runs in a click handler and only
    // needs the values as they are right now.
    getValues(field).forEach((_, i) => setValue(`${field}.${i}.key`, i === index));
  }

  function toPayload(values: FormValues): SaveReportInput {
    return {
      weekStart: values.weekStart,
      projectId: values.projectId ? Number(values.projectId) : null,
      tasks: values.tasks.map((t) => ({ ...t, deliverable: t.deliverable || null })),
      nextWeekPlan: values.nextWeekPlan || null,
      blockers: values.blockers.map((b) => ({
        description: b.description,
        key: b.key,
        resolved: b.resolved ?? false,
      })),
      achievements: values.achievements.map((a) => ({ description: a.description, key: a.key })),
      // Drop untouched buckets rather than storing a row of zeroes.
      hours: values.hours.filter((h) => h.hours > 0),
      notes: values.notes || null,
      links: values.links || null,
    };
  }

  function handleApiError(error: unknown) {
    setFormError(error instanceof ApiError ? error.message : "Could not save the report.");
  }

  const save = (thenSubmit: boolean) =>
    handleSubmit((values) => {
      setFormError(null);
      const payload = toPayload(values);

      const afterSave = (saved: ReportDetail) => {
        if (!thenSubmit) {
          router.push(`/reports/${saved.id}`);
          return;
        }
        submitReport.mutate(saved.id, {
          onSuccess: () => router.push(`/reports/${saved.id}`),
          onError: handleApiError,
        });
      };

      if (isEdit) {
        updateReport.mutate(
          { id: report.id, ...payload },
          { onSuccess: afterSave, onError: handleApiError },
        );
      } else {
        createReport.mutate(payload, { onSuccess: afterSave, onError: handleApiError });
      }
    });

  return (
    <form className="space-y-5" noValidate>
      {formError && <Alert>{formError}</Alert>}

      {/* ------------------------------------------------ week and project */}
      <Card>
        <CardHeader
          title="Week and project"
          description={
            weekStart && weekEnd ? `Covering ${weekRangeLabel(weekStart, weekEnd)}` : undefined
          }
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Week starting"
            htmlFor="weekStart"
            error={errors.weekStart?.message}
            hint={isEdit ? "The week cannot be changed after creation" : "Any date snaps to that week's Monday"}
            required
          >
            <Input
              id="weekStart"
              type="date"
              disabled={isEdit}
              value={weekStart}
              onChange={(event) => {
                const picked = event.target.value;
                if (!picked) return;
                // The API only accepts Mondays, so snap rather than reject.
                setValue("weekStart", format(startOfWeek(parseISO(picked), { weekStartsOn: 1 }), "yyyy-MM-dd"));
              }}
            />
          </Field>

          <Field label="Project or category" htmlFor="projectId" error={errors.projectId?.message}>
            <Select id="projectId" {...register("projectId")}>
              <option value="">No project</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {/* ------------------------------------------------- tasks completed */}
      <Card>
        <CardHeader
          title="Tasks completed"
          description="Planned versus actual, with the time each task took."
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => tasks.append(emptyTask)}>
              <Plus className="size-3.5" /> Add task
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {errors.tasks?.message && <Alert>{errors.tasks.message}</Alert>}

          {tasks.fields.map((field, index) => (
            <TaskRow
              key={field.id}
              index={index}
              register={register}
              control={control}
              errors={errors}
              onRemove={tasks.fields.length > 1 ? () => tasks.remove(index) : undefined}
            />
          ))}

          {tasks.fields.length === 0 && (
            <p className="py-4 text-center text-sm text-secondary">
              No tasks yet. Add at least one before submitting.
            </p>
          )}
        </CardBody>
      </Card>

      {/* -------------------------------------------------- next week plan */}
      <Card>
        <CardHeader title="Planned for next week" />
        <CardBody>
          <Textarea
            placeholder="What you intend to pick up next week…"
            {...register("nextWeekPlan")}
          />
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- blockers */}
      <NoteSection
        title="Blockers and challenges"
        description="Flag one as the key issue for the week."
        emptyLabel="No blockers this week."
        addLabel="Add blocker"
        fields={blockers.fields}
        onAdd={() => blockers.append({ description: "", key: blockers.fields.length === 0, resolved: false })}
        onRemove={blockers.remove}
        onSelectKey={(index) => selectKey("blockers", index)}
        register={register}
        name="blockers"
        watchKey={(index) => !!blockerValues?.[index]?.key}
        errors={errors.blockers}
        showResolved
      />

      {/* ------------------------------------------------- achievements */}
      <NoteSection
        title="Achievements and highlights"
        description="Flag one as the key achievement for the week."
        emptyLabel="No achievements recorded yet."
        addLabel="Add achievement"
        fields={achievements.fields}
        onAdd={() =>
          achievements.append({ description: "", key: achievements.fields.length === 0 })
        }
        onRemove={achievements.remove}
        onSelectKey={(index) => selectKey("achievements", index)}
        register={register}
        name="achievements"
        watchKey={(index) => !!achievementValues?.[index]?.key}
        errors={errors.achievements}
      />

      {/* --------------------------------------------------------- hours */}
      <Card>
        <CardHeader title="Hours by task type" description="Optional. Leave a bucket at zero to omit it." />
        <CardBody className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TASK_TYPES.map((taskType, index) => (
            <Field key={taskType} label={TASK_TYPE_LABEL[taskType]} htmlFor={`hours-${taskType}`}>
              <Input
                id={`hours-${taskType}`}
                type="number"
                min={0}
                step="0.5"
                {...register(`hours.${index}.hours`, { valueAsNumber: true })}
              />
            </Field>
          ))}
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- notes */}
      <Card>
        <CardHeader title="Notes and links" description="Optional context for your manager." />
        <CardBody className="space-y-4">
          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" {...register("notes")} />
          </Field>
          <Field
            label="Links"
            htmlFor="links"
            error={errors.links?.message}
            hint="One URL per line"
          >
            <Textarea id="links" className="min-h-16 font-mono text-xs" {...register("links")} />
          </Field>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------- actions */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={save(false)} loading={busy}>
          Save draft
        </Button>
        <Button type="button" onClick={save(true)} loading={busy}>
          {isEdit && report.status === "NEEDS_CORRECTION" ? "Resubmit for review" : "Submit for review"}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------- task row

function TaskRow({
  index,
  register,
  errors,
  onRemove,
}: {
  index: number;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  onRemove?: () => void;
}) {
  const rowErrors = errors.tasks?.[index];

  return (
    <div className="rounded-lg bg-surface-muted/50 p-3 ring-1 ring-border">
      <div className="grid gap-3 lg:grid-cols-12">
        <Field
          className="lg:col-span-4"
          label="Task"
          error={rowErrors?.name?.message}
          required
        >
          <Input placeholder="What did you work on?" invalid={!!rowErrors?.name} {...register(`tasks.${index}.name`)} />
        </Field>

        <Field className="lg:col-span-2" label="Priority">
          <Select {...register(`tasks.${index}.priority`)}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {humanise(priority)}
              </option>
            ))}
          </Select>
        </Field>

        <Field className="lg:col-span-2" label="Status">
          <Select {...register(`tasks.${index}.status`)}>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field className="lg:col-span-2" label="Planned %" error={rowErrors?.plannedPct?.message}>
          <Input type="number" min={0} max={100} invalid={!!rowErrors?.plannedPct} {...register(`tasks.${index}.plannedPct`, { valueAsNumber: true })} />
        </Field>

        <Field className="lg:col-span-2" label="Actual %" error={rowErrors?.actualPct?.message}>
          <Input type="number" min={0} max={100} invalid={!!rowErrors?.actualPct} {...register(`tasks.${index}.actualPct`, { valueAsNumber: true })} />
        </Field>

        <Field className="lg:col-span-2" label="Hours planned" error={rowErrors?.hoursPlanned?.message}>
          <Input type="number" min={0} step="0.5" invalid={!!rowErrors?.hoursPlanned} {...register(`tasks.${index}.hoursPlanned`, { valueAsNumber: true })} />
        </Field>

        <Field className="lg:col-span-2" label="Hours spent" error={rowErrors?.hoursSpent?.message}>
          <Input type="number" min={0} step="0.5" invalid={!!rowErrors?.hoursSpent} {...register(`tasks.${index}.hoursSpent`, { valueAsNumber: true })} />
        </Field>

        <Field className="lg:col-span-6" label="Output or deliverable" error={rowErrors?.deliverable?.message}>
          <Input placeholder="PR #21, design doc, release note…" {...register(`tasks.${index}.deliverable`)} />
        </Field>

        <div className="flex items-end lg:col-span-2">
          {onRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-status-missing">
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- note section

function NoteSection({
  title,
  description,
  emptyLabel,
  addLabel,
  fields,
  onAdd,
  onRemove,
  onSelectKey,
  register,
  name,
  watchKey,
  errors,
  showResolved = false,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  addLabel: string;
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSelectKey: (index: number) => void;
  register: UseFormRegister<FormValues>;
  name: "blockers" | "achievements";
  watchKey: (index: number) => boolean;
  errors?: { message?: string }[] | { message?: string };
  showResolved?: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        action={
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" /> {addLabel}
          </Button>
        }
      />
      <CardBody className="space-y-3">
        {fields.length === 0 && <p className="py-2 text-sm text-secondary">{emptyLabel}</p>}

        {fields.map((field, index) => {
          const rowError = Array.isArray(errors) ? errors[index] : undefined;
          return (
            <div key={field.id} className="rounded-lg bg-surface-muted/50 p-3 ring-1 ring-border">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="Describe it in a sentence…"
                    invalid={!!rowError}
                    {...register(`${name}.${index}.description`)}
                  />
                  {rowError && (
                    <p className="mt-1 text-xs text-status-missing">
                      {(rowError as { description?: { message?: string } }).description?.message}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-primary">
                  {/* A radio, not a checkbox: only one item can be the key one. */}
                  <input
                    type="radio"
                    name={`${name}-key`}
                    checked={watchKey(index)}
                    onChange={() => onSelectKey(index)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  Key item
                </label>

                {showResolved && (
                  <label className="flex items-center gap-2 text-xs text-primary">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-brand)]"
                      {...register(`${name}.${index}.resolved`)}
                    />
                    Resolved
                  </label>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="text-status-missing"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
