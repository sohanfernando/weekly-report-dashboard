"use client";

import { Loader2 } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import type { SubmissionState } from "@/lib/types";

/**
 * A small hand-rolled component kit.
 *
 * Deliberately not a component library: the app needs about ten primitives, and
 * hand-writing them keeps the dependency list short and every style decision
 * visible in one file.
 */

// ----------------------------------------------------------------- button

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90 disabled:opacity-50",
  secondary:
    "bg-surface text-foreground ring-1 ring-line hover:bg-surface-muted disabled:opacity-50",
  ghost: "text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition",
        "disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ card

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl bg-surface ring-1 ring-line", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

// ----------------------------------------------------------------- forms

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

const FIELD_BASE =
  "w-full rounded-lg bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-line " +
  "placeholder:text-muted/60 focus:ring-2 focus:ring-brand disabled:opacity-60";

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, invalid && "ring-rose-400 focus:ring-rose-500", className)}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, "min-h-24 resize-y", invalid && "ring-rose-400", className)}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, "appearance-none pr-8", invalid && "ring-rose-400", className)}
    >
      {children}
    </select>
  );
}

/** Wraps a control with its label and validation message. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- badges

export function StatusBadge({ state }: { state: SubmissionState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLE[state],
      )}
    >
      {STATUS_LABEL[state]}
    </span>
  );
}

export function Badge({
  children,
  className,
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-foreground",
        className,
      )}
    >
      {color && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

// ----------------------------------------------------------------- table

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  // Wide tables scroll inside their own container rather than pushing the page.
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[42rem] text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-line px-4 py-3 align-middle", className)}>{children}</td>;
}

// ----------------------------------------------------------------- state

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-muted", className)} aria-hidden />;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
      <Spinner />
      {label}…
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    error: "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900",
    info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900",
    success:
      "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900",
    warning:
      "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900",
  };
  return (
    <div className={cn("rounded-lg px-4 py-3 text-sm ring-1 ring-inset", tones[tone])} role="alert">
      {children}
    </div>
  );
}

/** A labelled number for the metric row at the top of the dashboard. */
export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass = {
    default: "text-foreground",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
    success: "text-emerald-600 dark:text-emerald-400",
  }[tone ?? "default"];

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
