"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number;
  /** Turns the tweened number into what the user reads. */
  format?: (value: number) => string;
  /** Seconds. Slightly longer than a normal entrance so the climb is legible. */
  duration?: number;
  className?: string;
}

/**
 * Counts a metric up to its value.
 *
 * Worth the effort on a dashboard for one reason: the movement tells you the
 * number changed. Switch the selected week and a figure that ticks from 40 to
 * 60 reports the change; one that simply swaps does not.
 *
 * Written to the DOM directly rather than through state — sixty renders a
 * second to animate a label would be absurd, and React would be doing
 * reconciliation work for something only one text node cares about.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration = DURATION.slow,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Where the last animation finished, so a change tweens from the number on
  // screen rather than restarting from zero.
  const shown = useRef(0);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;

      if (prefersReducedMotion()) {
        node.textContent = format(value);
        shown.current = value;
        return;
      }

      const counter = { current: shown.current };
      gsap.to(counter, {
        current: value,
        duration,
        ease: EASE.count,
        onUpdate: () => {
          node.textContent = format(counter.current);
        },
        onComplete: () => {
          // Land on the exact value: easing can stop a hair short.
          node.textContent = format(value);
          shown.current = value;
        },
      });
    },
    { dependencies: [value], revertOnUpdate: true },
  );

  return (
    <span ref={ref} className={className}>
      {/* Server-rendered and pre-hydration content: the real value, so the
          number is correct even if JavaScript never runs. */}
      {format(value)}
    </span>
  );
}
