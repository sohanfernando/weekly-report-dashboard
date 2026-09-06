"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Loader2 } from "lucide-react";
import { useRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/format";
import { DURATION, EASE, RESTING, withMotion } from "@/lib/motion";
import type { SubmissionState } from "@/lib/types";

/**
 * A small hand-rolled component kit.
 *
 * Deliberately not a component library: the app needs about ten primitives, and
 * hand-writing them keeps the dependency list short and every style decision
 * visible in one file. Colours come only from the theme tokens in globals.css.
 */

// ----------------------------------------------------------------- button

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:bg-brand-hover disabled:opacity-50",
  secondary:
    "bg-surface text-primary ring-1 ring-border hover:bg-surface-muted disabled:opacity-50",
  ghost: "text-secondary hover:bg-surface-muted hover:text-primary disabled:opacity-50",
  danger: "bg-status-missing text-white hover:brightness-95 disabled:opacity-50",
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
    <div className={cn("rounded-xl border border-border bg-surface", className)}>{children}</div>
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
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-secondary">{description}</p>}
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
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-primary">
      {children}
      {required && <span className="ml-0.5 text-status-missing">*</span>}
    </label>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary " +
  "placeholder:text-secondary/60 focus:border-brand focus:ring-1 focus:ring-brand " +
  "disabled:opacity-60";

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        invalid && "border-status-missing focus:border-status-missing focus:ring-status-missing",
        className,
      )}
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
      className={cn(
        FIELD_BASE,
        "min-h-24 resize-y",
        invalid && "border-status-missing focus:border-status-missing focus:ring-status-missing",
        className,
      )}
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
      className={cn(
        FIELD_BASE,
        "appearance-none pr-8",
        invalid && "border-status-missing",
        className,
      )}
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
        <p className="mt-1 text-xs text-status-missing">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- badges

/**
 * The single rendering of a report status anywhere in the app. Every screen
 * uses this, so Draft, Submitted, Needs correction and Approved always carry
 * their own colour from the design system.
 */
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
        "inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-primary",
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
        "border-b border-border px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-secondary",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-border px-4 py-3 align-middle", className)}>{children}</td>
  );
}

// ----------------------------------------------------------------- state

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-secondary", className)} aria-hidden />;
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-secondary">
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
      {icon && <div className="text-secondary">{icon}</div>}
      <p className="text-sm font-medium text-primary">{title}</p>
      {description && <p className="max-w-sm text-xs text-secondary">{description}</p>}
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
  const ref = useRef<HTMLDivElement>(null);

  // An alert usually appears in response to something the user just did, often
  // well down a long form. Arriving with a little movement is what makes it
  // get noticed at all.
  useGSAP(() => {
    const node = ref.current;
    if (!node) return;
    withMotion(
      node,
      () => {
        gsap.set(node, { opacity: 0, y: -6, scale: 0.99 });
        gsap.to(node, { ...RESTING, duration: DURATION.quick, ease: EASE.out });
      },
      () => gsap.set(node, RESTING),
    );
  });

  // Tones borrow the status palette so a warning here matches a "needs
  // correction" badge elsewhere, rather than introducing a second amber.
  const tones = {
    error: "bg-status-missing/10 text-status-missing ring-status-missing/25",
    info: "bg-status-submitted/10 text-status-submitted ring-status-submitted/25",
    success: "bg-status-approved/10 text-status-approved ring-status-approved/25",
    warning: "bg-status-correction/10 text-status-correction ring-status-correction/25",
  };
  return (
    <div
      ref={ref}
      className={cn("rounded-lg px-4 py-3 text-sm ring-1 ring-inset", tones[tone])}
      role="alert"
    >
      {children}
    </div>
  );
}

/**
 * A labelled number for the metric row at the top of the dashboard.
 *
 * `value` takes a node rather than a number so a caller can pass an
 * AnimatedNumber, or a composite like "3 / 5" built from one plus text,
 * without this component needing to know how to format either.
 */
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
    default: "text-primary",
    warning: "text-status-correction",
    danger: "text-status-missing",
    success: "text-status-approved",
  }[tone ?? "default"];

  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-secondary">{label}</p>
      {/* Metric numbers are the one place the system uses 700. */}
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneClass)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-secondary">{hint}</p>}
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
        <h1 className="text-xl font-semibold text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
