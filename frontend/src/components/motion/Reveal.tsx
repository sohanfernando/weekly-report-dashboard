"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, type ElementType, type ReactNode } from "react";
import { DURATION, EASE, RESTING, RISE, STAGGER, withMotion } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  /**
   * A CSS selector for the descendants to stagger. Omit to animate this element
   * as one piece.
   *
   * Selecting children rather than animating a wrapper matters for tables:
   * a `tbody` cannot be transformed without breaking row layout, but its `tr`s
   * can.
   */
  stagger?: string;
  /** Re-runs the animation whenever any of these change — a page or filter key. */
  deps?: unknown[];
  /** Seconds to wait, for sequencing one block after another. */
  delay?: number;
  as?: ElementType;
  className?: string;
}

/**
 * Fades and lifts its content into place on mount.
 *
 * The workhorse entrance for this app. Two rules it follows that hand-rolled
 * entrances usually break:
 *
 * 1. The from-state is set inside the same layout effect that starts the
 *    tween, so the content never paints at full opacity for a frame first.
 * 2. Under reduced motion nothing moves at all — the content is simply there,
 *    rather than being animated more slowly.
 */
export function Reveal({
  children,
  stagger,
  deps = [],
  delay = 0,
  as: Tag = "div",
  className,
}: RevealProps) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      const targets: gsap.TweenTarget = stagger
        ? Array.from(root.querySelectorAll(stagger))
        : root;

      // Nothing to stagger yet — the data has not arrived. Leaving the element
      // untouched is right: a loading skeleton should not fade in and out.
      if (Array.isArray(targets) && targets.length === 0) return;

      withMotion(
        root,
        () => {
          gsap.set(targets, { opacity: 0, y: RISE });
          gsap.to(targets, {
            ...RESTING,
            duration: DURATION.quick,
            ease: EASE.out,
            delay,
            stagger: stagger ? STAGGER : 0,
          });
        },
        () => {
          gsap.set(targets, RESTING);
        },
      );
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );

  return (
    <Tag ref={scope} className={className}>
      {children}
    </Tag>
  );
}
