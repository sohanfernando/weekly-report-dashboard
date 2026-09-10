import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ClipboardList,
  FolderKanban,
  History,
  LayoutDashboard,
  MessageSquareText,
  PanelRightOpen,
  PencilLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import dashboardShot from "@/assets/landing/dashboard.webp";
import myReportsShot from "@/assets/landing/my-reports.webp";
import phoneDashboardShot from "@/assets/landing/phone-dashboard.webp";
import phoneReviewShot from "@/assets/landing/phone-review.webp";
import reportReviewShot from "@/assets/landing/report-review.webp";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrowserFrame, PhoneFrame } from "@/components/landing/Frames";
import { LandingNav } from "@/components/landing/LandingNav";
import { ProductTour } from "@/components/landing/ProductTour";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Weekly Reports · Weekly work reporting for teams",
  description:
    "Team members file one structured report a week. Managers review it, request changes or approve it, with every version kept.",
};

const PRIMARY_LG =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-base " +
  "font-semibold text-brand-foreground shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 " +
  "hover:bg-brand-hover hover:shadow-xl hover:shadow-brand/30";

const SECONDARY_LG =
  "inline-flex h-12 items-center justify-center rounded-full bg-surface px-7 text-base font-semibold " +
  "text-primary ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/30";

/**
 * The public front door.
 *
 * A server component: everything here is static except the nav (which asks
 * whether there is a session), the product tour (tabs), and the scroll
 * entrances, and those three are the only client pieces. Every picture is a
 * real screenshot of the running app with the demo data.
 */
export default function LandingPage() {
  return (
    <ScrollReveal>
      <HeroBackdrop />
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <Section
          id="tour"
          eyebrow="Product tour"
          title="See it with real data"
          intro="Screens from the running app, filled with the demo team: five members, five projects and several weeks of reports."
        >
          <div data-reveal>
            <ProductTour />
          </div>
        </Section>
        <Workflow />
        <Roles />
        <AnyScreen />
        <CallToAction />
      </main>
      <Footer />
    </ScrollReveal>
  );
}

// ------------------------------------------------------------------- hero

/** Grid lines and two colour fields behind the top of the page, nav included. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-224 overflow-hidden">
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)]
                   bg-size-[56px_56px] opacity-70
                   mask-[radial-gradient(ellipse_60%_55%_at_50%_0%,black,transparent)]"
      />
      <div className="absolute -top-48 left-1/2 size-168 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute -right-40 top-40 size-112 rounded-full bg-status-approved/10 blur-3xl" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative px-5 pb-8 pt-14 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <p
          className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface/70 px-3.5
                     py-1.5 text-xs font-medium text-brand shadow-sm backdrop-blur motion-safe:animate-rise"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-status-approved opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-status-approved" />
          </span>
          Weekly reports, reviews and an AI assistant
        </p>

        <h1
          className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-primary
                     [animation-delay:80ms] motion-safe:animate-rise sm:text-6xl lg:text-7xl"
        >
          Stop chasing <br className="max-sm:hidden" />
          <span className="bg-linear-to-r from-brand via-status-submitted to-status-approved bg-clip-text text-transparent">
            status updates.
          </span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-secondary [animation-delay:160ms]
                     motion-safe:animate-rise"
        >
          Your team files one structured report a week. You approve it or send it back with a
          comment, and every version is kept. The dashboard shows who is on track before you
          have to ask.
        </p>

        <div
          className="mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:240ms]
                     motion-safe:animate-rise sm:flex-row"
        >
          <Link href="/register" className={cn(PRIMARY_LG, "w-full max-w-xs sm:w-auto")}>
            Create an account
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a href="#tour" className={cn(SECONDARY_LG, "w-full max-w-xs sm:w-auto")}>
            Take the tour
          </a>
        </div>

        <ul
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-secondary
                     [animation-delay:320ms] motion-safe:animate-rise"
        >
          {["Private drafts", "Every version kept", "Role-based access"].map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="size-4 text-status-approved" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl perspective-[2400px] [animation-delay:400ms] motion-safe:animate-rise">
        {/* Tilted back at lg and up, and straightened on hover. */}
        <div
          className="origin-bottom transition-transform duration-700 ease-out
                     lg:motion-safe:rotate-x-8 lg:motion-safe:hover:rotate-x-0"
        >
          <BrowserFrame label="Team dashboard">
            <Image
              src={dashboardShot}
              alt="The team dashboard: reports submitted, compliance, needs correction, open blockers, and who has filed this week"
              priority
              placeholder="blur"
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="h-auto w-full"
            />
          </BrowserFrame>
        </div>

        <FloatingCard className="-left-6 top-1/3 w-68 xl:-left-14">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-status-correction/15 text-status-correction">
              <MessageSquareText className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">Changes requested</p>
              <p className="text-xs text-secondary">Version 1 kept exactly as reviewed</p>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs leading-relaxed text-secondary">
            &ldquo;The hours on the refactor look low. Can you check them?&rdquo;
          </p>
        </FloatingCard>

        <FloatingCard className="-right-6 top-14 w-60 [animation-delay:-3.5s] xl:-right-14">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-status-approved/15 text-status-approved">
              <BadgeCheck className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">Report approved</p>
              <p className="text-xs text-secondary">Version 2 · now final</p>
            </div>
          </div>
        </FloatingCard>

        {/* Fades the screenshot's cut-off bottom edge into the page. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-40 bg-linear-to-t from-background to-transparent"
        />
      </div>
    </section>
  );
}

/** Decorative cards around the hero screenshot. Hidden below lg, where they would cover it. */
function FloatingCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute z-10 hidden rounded-2xl border border-border bg-surface/95 p-4 shadow-xl shadow-ink/10",
        "backdrop-blur motion-safe:animate-float lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

// -------------------------------------------------------------- features

function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything a weekly report needs"
      intro="One place to write the week, review it, and see how the whole team is doing."
    >
      {/*
        Spans chosen so no size leaves a hole: at lg, 2+1 / 1+1+1 / 1+2; at
        sm, six single cards in pairs and the assistant across the bottom.
      */}
      {/* grid-cols-1 (minmax(0, 1fr)) so a card's unwrapped task names
          cannot widen the single phone column past the screen. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          className="lg:col-span-2"
          icon={ClipboardList}
          title="Structured weekly reports"
          body="Tasks with priority, status, planned against actual progress and hours, plus next week’s plan, blockers and achievements. The week is filled in for you and always starts on a Monday."
        >
          <TaskPreview />
        </FeatureCard>
        <FeatureCard
          icon={MessageSquareText}
          title="Review with comments"
          body="Approve a report, or send it back with a comment. The comment stays attached to the exact version you read."
        />
        <FeatureCard
          icon={History}
          title="Every version kept"
          body="Sending a report back never overwrites it. Version one stays as reviewed, and the fix arrives as version two."
        />
        <FeatureCard
          icon={LayoutDashboard}
          title="A dashboard for the week"
          body="Who has filed and who hasn’t, the compliance rate, open blockers, and charts of tasks, projects and time."
        />
        <FeatureCard
          icon={FolderKanban}
          title="Projects and assignments"
          body="Group reports by project, assign members to the projects they work on, and archive old ones without losing history."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Access checked on the server"
          body="Members see their own reports, managers see the team, and drafts stay private. The API enforces it, not just the screen."
        />
        <FeatureCard
          className="sm:col-span-2"
          icon={Bot}
          title="An assistant that reads, never writes"
          body="Managers ask plain questions about the week. It uses the same data as the dashboard, and it has no way to approve, edit or delete anything."
        >
          <ChatPreview />
        </FeatureCard>
      </div>
    </Section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div data-reveal className={className}>
      <article
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface p-7
                   transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1
                   hover:border-brand/30 hover:shadow-xl hover:shadow-brand/10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-brand/15 opacity-0
                     blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          className="relative grid size-11 place-items-center rounded-2xl bg-brand/10 text-brand transition-colors
                     duration-300 group-hover:bg-brand group-hover:text-brand-foreground"
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <h3 className="relative mt-5 text-lg font-semibold text-primary">{title}</h3>
        <p className="relative mt-2 text-sm leading-relaxed text-secondary">{body}</p>
        {children && <div className="relative mt-6 flex flex-1 flex-col justify-end">{children}</div>}
      </article>
    </div>
  );
}

/** Same three tasks as the report in the tour's "Report review" screenshot. */
const PREVIEW_TASKS = [
  { name: "Payment reconciliation endpoint", priority: "High", pill: "bg-status-correction/15 text-status-correction", progress: 100, hours: "4h / 4h" },
  { name: "Refactor invoice service", priority: "Medium", pill: "bg-status-submitted/10 text-status-submitted", progress: 100, hours: "8h / 8h" },
  { name: "Fix N+1 on order history", priority: "Low", pill: "bg-status-draft/15 text-secondary", progress: 73, hours: "7h / 6h" },
];

function TaskPreview() {
  return (
    <div aria-hidden className="rounded-2xl border border-border bg-surface-muted p-2">
      {PREVIEW_TASKS.map((task) => (
        <div
          key={task.name}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{task.name}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium max-sm:hidden", task.pill)}>
            {task.priority}
          </span>
          <span className="hidden w-24 sm:block">
            <span className="block h-1.5 overflow-hidden rounded-full bg-border">
              <span
                className={cn(
                  "block h-full rounded-full",
                  task.progress === 100 ? "bg-status-approved" : "bg-status-correction",
                )}
                style={{ width: `${task.progress}%` }}
              />
            </span>
          </span>
          <span className="w-16 text-right text-xs tabular-nums text-secondary">{task.hours}</span>
        </div>
      ))}
    </div>
  );
}

/** The exchange in the tour's "AI assistant" screenshot. */
function ChatPreview() {
  return (
    <div aria-hidden className="space-y-3 rounded-2xl border border-border bg-surface-muted p-4">
      <div className="flex justify-end">
        <p className="rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm text-brand-foreground">
          Who has open blockers?
        </p>
      </div>
      <div className="flex gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Bot className="size-4" />
        </span>
        <div className="rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5 text-sm text-primary ring-1 ring-border">
          <ul className="list-disc space-y-1 pl-4 marker:text-secondary">
            <li>
              <strong className="font-semibold">Dinuka Perera</strong>: design tokens for dark mode
              are still under review
            </li>
            <li>
              <strong className="font-semibold">Ravi Silva</strong>: waiting on the payment
              provider’s sandbox credentials
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- workflow

const STEPS: {
  status: string;
  title: string;
  body: string;
  icon: LucideIcon;
  tone: string;
  pill: string;
  hover: string;
}[] = [
  {
    status: "Draft",
    title: "Write the week",
    body: "Tasks, hours, blockers and achievements in one form. A draft is private: only the person writing it can open it.",
    icon: PencilLine,
    tone: "bg-status-draft",
    pill: "bg-status-draft/15 text-secondary",
    hover: "hover:border-status-draft/60",
  },
  {
    status: "Submitted",
    title: "Submit for review",
    body: "Submitting locks the report, so it can’t change while the manager is reading it.",
    icon: Send,
    tone: "bg-status-submitted",
    pill: "bg-status-submitted/10 text-status-submitted",
    hover: "hover:border-status-submitted/50",
  },
  {
    status: "Needs correction",
    title: "Send it back",
    body: "The manager asks for changes with a comment. The reviewed version is kept, and the fix becomes version two.",
    icon: RotateCcw,
    tone: "bg-status-correction",
    pill: "bg-status-correction/15 text-status-correction",
    hover: "hover:border-status-correction/50",
  },
  {
    status: "Approved",
    title: "Approve",
    body: "Once it’s approved, the report is final and read-only for everyone.",
    icon: BadgeCheck,
    tone: "bg-status-approved",
    pill: "bg-status-approved/15 text-status-approved",
    hover: "hover:border-status-approved/50",
  },
];

function Workflow() {
  return (
    <Section
      id="workflow"
      eyebrow="How it works"
      title="How a report moves"
      intro="Four statuses, one direction of travel, and a record of every round."
      className="bg-linear-to-b from-transparent via-brand/3 to-transparent"
    >
      <ol className="relative grid gap-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {/* The line joining the four icons, with a light travelling along it. */}
        <div
          aria-hidden
          className="absolute inset-x-[12.5%] top-7 hidden h-0.5 overflow-hidden rounded-full lg:block
                     bg-[linear-gradient(to_right,var(--color-status-draft),var(--color-status-submitted),var(--color-status-correction),var(--color-status-approved))]"
        >
          <span className="block h-full w-1/4 bg-linear-to-r from-transparent via-white to-transparent motion-safe:animate-travel" />
        </div>

        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.status} data-reveal className="relative flex flex-col items-center text-center">
              <span
                className={cn(
                  "relative grid size-14 place-items-center rounded-2xl text-white shadow-lg ring-8 ring-background",
                  step.tone,
                )}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <div
                className={cn(
                  "mt-5 w-full flex-1 rounded-3xl border border-border bg-surface p-6",
                  "transition-[translate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-xl",
                  step.hover,
                )}
              >
                <p className="text-xs font-medium text-secondary">Step {index + 1}</p>
                <span className={cn("mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", step.pill)}>
                  {step.status}
                </span>
                <h3 className="mt-3 text-base font-semibold text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p data-reveal className="mx-auto mt-10 max-w-xl text-center text-sm text-secondary">
        <History className="mr-1.5 inline-block size-4 align-[-3px] text-brand" aria-hidden />
        A report can go back and forth as often as it needs. Every round is in its history.
      </p>
    </Section>
  );
}

// ----------------------------------------------------------------- roles

function Roles() {
  return (
    <Section
      id="roles"
      eyebrow="Who it’s for"
      title="One app, two points of view"
      intro="Members and managers sign in to the same place and each see what they need."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <RoleCard
          badge="Team members"
          title="File your week once"
          lead="And always know where your report stands."
          points={[
            "One form for tasks, hours, blockers, achievements and next week’s plan",
            "The week fills itself in, starting on Monday",
            "Save a draft and come back to it. Nobody else can see it",
            "Your manager’s comments appear on the report itself",
            "Every week you’ve filed, with its status and version",
          ]}
          image={myReportsShot}
          alt="A team member’s list of weekly reports"
        />
        <RoleCard
          dark
          badge="Managers"
          title="See the whole team"
          lead="Without asking anyone for an update."
          points={[
            "Who has filed and who hasn’t, on one dashboard",
            "Approve, or send a report back with a comment",
            "Earlier versions kept, with the full review history",
            "Blockers and achievements across the team",
            "Projects, members and roles in one place",
          ]}
          image={reportReviewShot}
          alt="A report open for review, with approve and request changes buttons"
        />
      </div>
    </Section>
  );
}

function RoleCard({
  dark = false,
  badge,
  title,
  lead,
  points,
  image,
  alt,
}: {
  dark?: boolean;
  badge: string;
  title: string;
  lead: string;
  points: string[];
  image: StaticImageData;
  alt: string;
}) {
  return (
    <div data-reveal>
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-4xl p-8 pb-0 sm:p-10 sm:pb-0",
          "transition-shadow duration-300 hover:shadow-2xl",
          dark
            ? "bg-ink text-white hover:shadow-ink/30"
            : "border border-border bg-surface hover:shadow-brand/10",
        )}
      >
        {dark && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-24 size-80 rounded-full bg-brand/40 blur-3xl" />
            <div className="absolute -right-16 bottom-10 size-72 rounded-full bg-status-approved/20 blur-3xl" />
          </div>
        )}

        <div className="relative">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              dark ? "bg-white/10 text-white" : "bg-brand/10 text-brand",
            )}
          >
            {badge}
          </span>
          <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
          <p className={cn("mt-2", dark ? "text-white/70" : "text-secondary")}>{lead}</p>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className={cn("flex gap-3 text-sm", dark ? "text-white/85" : "text-primary")}>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-status-approved/20 text-status-approved">
                  <Check className="size-3.5" aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* The screenshot peeks up from the bottom edge and rises on hover. */}
        <div
          className={cn(
            "relative mt-10 h-56 overflow-hidden rounded-t-2xl border border-b-0 sm:h-72",
            dark ? "border-white/10" : "border-border",
          )}
        >
          <Image
            src={image}
            alt={alt}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="h-auto w-full transition-transform duration-500 ease-out group-hover:-translate-y-6
                       motion-reduce:transition-none"
          />
        </div>
      </article>
    </div>
  );
}

// ------------------------------------------------------------ any screen

function AnyScreen() {
  const points: { icon: LucideIcon; text: string }[] = [
    { icon: Smartphone, text: "On a phone, every table row becomes its own labelled card" },
    { icon: Tablet, text: "On a tablet, less important columns step aside" },
    { icon: PanelRightOpen, text: "On a laptop, the sidebar folds into an icon rail" },
  ];

  return (
    <section className="scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div data-reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Any screen</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            Tables that still make sense on a phone
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-secondary">
            Nobody scrolls a six-column table sideways. So the layout changes with the screen,
            and the review queue stays readable on the way into a meeting.
          </p>
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-primary">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div data-reveal className="relative flex justify-center py-6">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/15 blur-3xl"
          />
          <PhoneFrame
            className="relative w-44 translate-y-8 -rotate-6 transition-[rotate,translate] duration-500
                       hover:translate-y-4 hover:rotate-0 sm:w-60"
          >
            <Image
              src={phoneReviewShot}
              alt="The review queue on a phone, each report shown as a card"
              sizes="240px"
              className="h-auto w-full"
            />
          </PhoneFrame>
          <PhoneFrame
            className="relative z-10 -ml-12 w-44 rotate-3 transition-[rotate,translate] duration-500
                       hover:-translate-y-2 hover:rotate-0 sm:-ml-16 sm:w-60"
          >
            <Image
              src={phoneDashboardShot}
              alt="The dashboard’s filing table on a phone, each member shown as a card"
              sizes="240px"
              className="h-auto w-full"
            />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------- end

function CallToAction() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div
        data-reveal
        className="relative mx-auto max-w-6xl overflow-hidden rounded-4xl bg-ink px-6 py-16 text-center text-white
                   sm:px-16 sm:py-20"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 size-96 rounded-full bg-brand/50 blur-3xl" />
          <div className="absolute -bottom-24 -right-12 size-96 rounded-full bg-status-approved/25 blur-3xl" />
        </div>
        <div className="relative">
          <BrandMark className="mx-auto size-12" />
          <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            Ready to stop chasing status updates?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Create an account and file your first report in a few minutes.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7
                         font-semibold text-ink transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/20"
            >
              Create an account
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full px-7 font-semibold text-white
                         ring-1 ring-white/25 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-secondary sm:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark className="size-6 shrink-0" />
          <span className="font-semibold text-primary">Weekly Reports</span>
        </Link>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/login" className="transition-colors hover:text-brand">
            Sign in
          </Link>
          <Link href="/register" className="transition-colors hover:text-brand">
            Register
          </Link>
        </nav>
      </div>
    </footer>
  );
}

// -------------------------------------------------------------- helpers

function Section({
  id,
  eyebrow,
  title,
  intro,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    // scroll-mt clears the sticky nav when a #link lands here.
    <section id={id} className={cn("scroll-mt-20 px-5 py-24 sm:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {intro && <p className="mt-4 text-lg leading-relaxed text-secondary">{intro}</p>}
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
