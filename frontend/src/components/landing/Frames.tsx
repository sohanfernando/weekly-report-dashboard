import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Window chrome around a product screenshot, so a picture of the app reads as
 * the app rather than as a loose image. The three dots take the status
 * colours instead of borrowed operating-system reds and yellows, keeping to
 * the palette in globals.css.
 */
export function BrowserFrame({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-brand/10",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-status-missing/70" />
          <span className="size-2.5 rounded-full bg-status-correction/70" />
          <span className="size-2.5 rounded-full bg-status-approved/70" />
        </div>
        <div
          className="mx-auto flex h-6 w-full max-w-xs min-w-0 items-center justify-center gap-1.5
                     rounded-md bg-surface px-3 text-[11px] text-secondary ring-1 ring-border"
        >
          <Lock className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
        {/* Same width as the dots, so the address bar sits truly centred. */}
        <div className="w-10.5 shrink-0" aria-hidden />
      </div>
      {children}
    </div>
  );
}

/** A phone body around a narrow screenshot, for the small-screen section. */
export function PhoneFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative rounded-[2.5rem] bg-ink p-2 shadow-2xl shadow-ink/30 ring-1 ring-white/10",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-3.5 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-ink"
      />
      <div className="overflow-hidden rounded-[2rem] bg-background">{children}</div>
    </div>
  );
}
