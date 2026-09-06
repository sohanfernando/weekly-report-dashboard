"use client";

import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion";

/**
 * Animates a panel open and closed by height.
 *
 * Height is the one property worth animating despite the layout cost, because
 * the alternatives all lie: a transform-scaled panel squashes its text, and a
 * fade alone leaves the content below it jumping.
 *
 * Children stay mounted for the duration of the closing tween and are removed
 * afterwards, so a panel holding an entire report is not sitting in the DOM
 * while collapsed.
 */
export function Collapse({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // "Open, or still animating shut."
  const [mounted, setMounted] = useState(open);

  // Opening has to mount the children before the effect can measure them.
  // Adjusting state during render is React's documented answer to that, and it
  // avoids the cascading extra render an effect would cost.
  const [previousOpen, setPreviousOpen] = useState(open);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setMounted(true);
  }

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reduced motion runs the same code path at zero duration rather than a
    // separate branch, so onComplete still fires and unmounting stays in one
    // place.
    const scale = prefersReducedMotion() ? 0 : 1;

    const tween = open
      ? gsap.fromTo(
          node,
          { height: 0, opacity: 0 },
          {
            // "auto" measures the natural height, tweens to it, then clears the
            // inline value so the panel stays responsive to its own content.
            height: "auto",
            opacity: 1,
            duration: DURATION.base * scale,
            ease: EASE.out,
            clearProps: "height",
          },
        )
      : gsap.to(node, {
          height: 0,
          opacity: 0,
          duration: DURATION.quick * scale,
          ease: EASE.inOut,
          onComplete: () => setMounted(false),
        });

    return () => {
      tween.kill();
    };
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      {children}
    </div>
  );
}
