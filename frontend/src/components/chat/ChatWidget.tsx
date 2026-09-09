"use client";

import gsap from "gsap";
import { Bot, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Alert, Button, Spinner } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion";
import { useAskAssistant, useChatStatus, useMe } from "@/lib/queries";
import type { ChatTurn } from "@/lib/types";

/** Line break, named so the JSX below stays readable. */
const NEWLINE = "\n";

/** Openers, so the first use is not a blank box and a blinking cursor. */
const SUGGESTIONS = [
  "Summarise this week for me",
  "Who has open blockers?",
  "Who has not submitted yet?",
  "How is work split across projects?",
];

/**
 * The AI chat assistant (Section 8).
 *
 * <p>Manager-only, and hidden entirely when the deployment has no API key —
 * offering a feature that can only answer 503 is worse than not offering it.
 * The server enforces both of those rules; this only avoids showing a door that
 * will not open.
 */
export function ChatWidget() {
  const { data: me } = useMe();
  const isManager = me?.role === "MANAGER";
  const { data: status } = useChatStatus(isManager);

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ask = useAskAssistant();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Mounted means "open, or still animating shut" — same approach as Collapse,
  // so the panel is not sitting in the DOM while it is closed.
  const [mounted, setMounted] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setMounted(true);
  }

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    // Opening should leave the cursor where the next thing happens.
    if (open) inputRef.current?.focus();

    const scale = prefersReducedMotion() ? 0 : 1;
    const tween = open
      ? gsap.fromTo(
          node,
          { opacity: 0, y: 16, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: DURATION.quick * scale,
            ease: EASE.out,
            clearProps: "transform",
          },
        )
      : gsap.to(node, {
          opacity: 0,
          y: 12,
          scale: 0.98,
          duration: DURATION.instant * scale,
          ease: EASE.in,
          onComplete: () => setMounted(false),
        });

    return () => {
      tween.kill();
    };
  }, [open, mounted]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, ask.isPending]);

  function send(text: string) {
    const message = text.trim();
    if (!message || ask.isPending) return;

    setError(null);
    setDraft("");
    // The question appears immediately; the transcript sent to the server is
    // the one from before it, because the message travels separately.
    const history = turns;
    setTurns([...history, { role: "USER", content: message }]);

    ask.mutate(
      { message, history },
      {
        onSuccess: (reply) =>
          setTurns((current) => [...current, { role: "ASSISTANT", content: reply.reply }]),
        onError: (cause) => {
          setError(
            cause instanceof ApiError ? cause.message : "The assistant could not answer.",
          );
          // Drop the unanswered question so retrying does not double it up.
          setTurns((current) => current.slice(0, -1));
          setDraft(message);
        },
      },
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line — the convention everywhere else.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  }

  if (!isManager || !status?.available) return null;

  return (
    <>
      {mounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Team assistant"
          className="fixed bottom-24 right-6 z-40 flex w-[min(28rem,calc(100vw-3rem))]
                     h-[min(34rem,calc(100dvh-9rem))] flex-col overflow-hidden rounded-xl
                     border border-border bg-surface shadow-xl"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Team assistant</p>
              <p className="truncate text-xs text-secondary">Reads your team&rsquo;s reports</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
              className="rounded-lg p-1.5 text-secondary transition-colors hover:bg-background hover:text-primary"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-secondary">
                  Ask about the team&rsquo;s week. Answers come from the reports themselves, not
                  from a guess.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-secondary
                                 transition-colors hover:border-brand hover:text-brand"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, index) => (
              <Bubble key={`${turn.role}-${index}`} turn={turn} />
            ))}

            {ask.isPending && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Spinner className="size-4" />
                Reading the reports&hellip;
              </div>
            )}

            {error && <Alert tone="error">{error}</Alert>}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about the team&hellip;"
                maxLength={1000}
                className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-border bg-surface
                           px-3 py-2 text-sm text-primary outline-none placeholder:text-secondary/60
                           focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <Button
                size="sm"
                onClick={() => send(draft)}
                disabled={!draft.trim() || ask.isPending}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close the assistant" : "Open the assistant"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full
                   bg-brand text-brand-foreground shadow-lg transition-colors hover:bg-brand-hover
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </>
  );
}

/** One turn. The assistant is marked so a long answer is not mistaken for input. */
function Bubble({ turn }: { turn: ChatTurn }) {
  if (turn.role === "USER") {
    return (
      <div className="flex justify-end">
        <p
          className="max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm
                     bg-brand px-3 py-2 text-sm text-brand-foreground"
        >
          {turn.content}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Bot className="size-3.5" />
      </span>
      <div
        className="min-w-0 max-w-[85%] break-words rounded-xl rounded-bl-sm bg-background
                   px-3 py-2 text-sm text-primary"
      >
        <Markdown text={turn.content} />
      </div>
    </div>
  );
}

/**
 * Just enough markdown for what this assistant is asked to produce: bold, "- "
 * bullets and paragraph breaks.
 *
 * A full markdown library would be a dependency and a security surface for
 * model output, to render three constructs. The prompt already rules out
 * tables and headings, so this handles the rest and lets anything unexpected
 * fall through as plain text rather than as broken markup.
 */
function Markdown({ text }: { text: string }) {
  // Group consecutive "- " lines so a list renders as one <ul>.
  const blocks: { bullet: boolean; lines: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const bullet = /^\s*[-*•]\s+/.test(line);
    if (!line.trim()) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.bullet === bullet) last.lines.push(line);
    else blocks.push({ bullet, lines: [line] });
  }

  return (
    <>
      {blocks.map((block, index) =>
        block.bullet ? (
          <ul key={index} className="my-1 list-disc space-y-0.5 pl-4 marker:text-secondary">
            {block.lines.map((line, item) => (
              <li key={item}>
                <Inline text={line.replace(/^\s*[-*•]\s+/, "")} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={index} className="my-1 whitespace-pre-wrap first:mt-0 last:mb-0">
            <Inline text={block.lines.join(NEWLINE)} />
          </p>
        ),
      )}
    </>
  );
}

/** Bold spans. Split rather than replaced, so nothing is injected as HTML. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
        // Odd indices are the captured groups, i.e. what was inside the asterisks.
        index % 2 === 1 ? (
          <strong key={index} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}
