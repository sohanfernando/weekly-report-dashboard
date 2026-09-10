"use client";

import { Bot, ClipboardList, FileText, LayoutDashboard, ShieldCheck, type LucideIcon } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import assistantShot from "@/assets/landing/assistant.webp";
import dashboardShot from "@/assets/landing/dashboard.webp";
import myReportsShot from "@/assets/landing/my-reports.webp";
import reportReviewShot from "@/assets/landing/report-review.webp";
import reviewQueueShot from "@/assets/landing/review-queue.webp";
import { cn } from "@/lib/cn";
import { BrowserFrame } from "./Frames";

interface Tab {
  id: string;
  label: string;
  /** The name below lg, where five tabs share one row. */
  short: string;
  description: string;
  address: string;
  icon: LucideIcon;
  image: StaticImageData;
  alt: string;
}

const TABS: Tab[] = [
  {
    id: "dashboard",
    label: "Team dashboard",
    short: "Dashboard",
    description:
      "The week at a glance: who has filed, the compliance rate, open blockers, and charts of the team’s work.",
    address: "Team dashboard",
    icon: LayoutDashboard,
    image: dashboardShot,
    alt: "Team dashboard with submission stats and a table of who has filed this week",
  },
  {
    id: "review",
    label: "Review queue",
    short: "Queue",
    description: "Every submitted report in one table, filtered by status, member, project or week.",
    address: "Review queue",
    icon: ShieldCheck,
    image: reviewQueueShot,
    alt: "Review queue table listing reports with their week, project, status and version",
  },
  {
    id: "report",
    label: "Report review",
    short: "Report",
    description:
      "Tasks, hours, blockers and achievements on one page, with approve and request changes beside them.",
    address: "Review · Ravi Silva",
    icon: FileText,
    image: reportReviewShot,
    alt: "A submitted report open for review, with tasks, blockers, achievements and the decision panel",
  },
  {
    id: "mine",
    label: "My reports",
    short: "My reports",
    description: "A member’s own history: every week filed, with its project, status and version.",
    address: "My reports",
    icon: ClipboardList,
    image: myReportsShot,
    alt: "A team member’s list of weekly reports with status badges",
  },
  {
    id: "assistant",
    label: "AI assistant",
    short: "Assistant",
    description:
      "Managers ask plain questions about the week and get answers drawn from the reports themselves.",
    address: "Team dashboard · Assistant",
    icon: Bot,
    image: assistantShot,
    alt: "The team assistant panel answering which team members have open blockers",
  },
];

/**
 * Real screenshots of the running app behind a set of tabs.
 *
 * Every image is mounted and they cross-fade, rather than swapping one `src`:
 * switching tabs is then instant, with no blank frame while the next picture
 * downloads.
 *
 * The tabs take two shapes from one set of buttons. Below lg they are a
 * five-way segmented control that shares a single row in equal parts, so all
 * five are always in view and nothing scrolls sideways. At lg and up they
 * become a vertical list of cards beside the screenshot, with room for the
 * open tab to describe itself.
 */
export function ProductTour() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = TABS[active];

  // Arrow keys move between tabs, as they do in any tab list. Both axes,
  // because the list is a row on small screens and a column on large ones.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const next = (active + (forward ? 1 : -1) + TABS.length) % TABS.length;
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    // grid-cols-1 is minmax(0, 1fr), so nothing inside can widen the
    // column past the screen on a phone.
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div
        role="tablist"
        aria-label="Product screens"
        onKeyDown={onKeyDown}
        className="grid grid-cols-5 gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-sm
                   min-[400px]:gap-1
                   lg:flex lg:flex-col lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0
                   lg:shadow-none"
      >
        {TABS.map((tab, index) => {
          const selected = index === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`tour-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls="tour-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              className={cn(
                // Below lg: one segment of the control. Icon over label on
                // a phone, side by side from sm.
                "group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2",
                "text-center transition-colors duration-200 sm:flex-row sm:gap-2 sm:py-2.5",
                // lg and up: a card in the vertical list.
                "lg:items-start lg:justify-start lg:gap-3 lg:rounded-2xl lg:border lg:p-4 lg:text-left",
                "lg:transition-[background-color,border-color,box-shadow,color]",
                selected
                  ? "bg-brand text-brand-foreground shadow-sm shadow-brand/30 lg:border-brand/30 lg:bg-surface lg:text-primary lg:shadow-lg lg:shadow-brand/10"
                  : "text-secondary hover:bg-brand/5 hover:text-brand lg:border-transparent lg:hover:border-border lg:hover:bg-surface lg:hover:text-primary",
              )}
            >
              {/* A plain icon inside a segment; a tinted tile on a card. */}
              <span
                className={cn(
                  "grid shrink-0 place-items-center lg:size-9 lg:rounded-xl lg:transition-colors",
                  selected
                    ? "lg:bg-brand lg:text-brand-foreground"
                    : "lg:bg-brand/10 lg:text-brand lg:group-hover:bg-brand/15",
                )}
              >
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className={cn("min-w-0 max-w-full lg:self-center", selected && "lg:self-start")}>
                {/* 10px under 400px wide, like a phone's own tab bar: at 11px
                    "Dashboard" no longer fits a fifth of a 360px screen. */}
                <span
                  className="block truncate text-[10px] font-semibold tracking-tight min-[400px]:text-[11px]
                             sm:text-sm sm:tracking-normal lg:hidden"
                >
                  {tab.short}
                </span>
                <span className="hidden whitespace-nowrap text-sm font-semibold lg:block">{tab.label}</span>
                {/* Only the open tab explains itself, so the list stays
                    shorter than the screenshot beside it. */}
                <span
                  className={cn(
                    "mt-1 hidden text-sm font-normal leading-relaxed text-secondary",
                    selected && "lg:block",
                  )}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        <p className="mb-4 text-center text-sm leading-relaxed text-secondary lg:hidden">
          {current.description}
        </p>
        <BrowserFrame label={current.address}>
          <div
            id="tour-panel"
            role="tabpanel"
            aria-labelledby={`tour-tab-${current.id}`}
            className="relative aspect-8/5 bg-background"
          >
            {TABS.map((tab, index) => (
              <Image
                key={tab.id}
                src={tab.image}
                alt={index === active ? tab.alt : ""}
                aria-hidden={index !== active}
                fill
                sizes="(min-width: 1280px) 860px, (min-width: 1024px) 70vw, 100vw"
                className={cn(
                  "object-cover object-top transition-opacity duration-500 motion-reduce:transition-none",
                  index === active ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </BrowserFrame>
      </div>
    </div>
  );
}
