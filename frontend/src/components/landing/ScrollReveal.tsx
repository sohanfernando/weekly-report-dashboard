"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, type ReactNode } from "react";
import { DURATION, EASE, withMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Fades each `[data-reveal]` element up as it scrolls into view.
 *
 * Only elements that start below the fold are hidden. Anything already on
 * screen when the page hydrates was painted visible by the server, and hiding
 * it now would flash it off and back on; the hero has its own CSS entrance
 * for exactly that reason.
 *
 * Put `data-reveal` on a wrapper, not on an element with its own hover
 * transition: GSAP writes opacity every frame, and a CSS transition on the
 * same property would chase it.
 */
export function ScrollReveal({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;

      withMotion(root, () => {
        const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
          (element) => element.getBoundingClientRect().top > window.innerHeight,
        );
        if (targets.length === 0) return;

        gsap.set(targets, { opacity: 0, y: 28 });
        ScrollTrigger.batch(targets, {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: DURATION.slow,
              ease: EASE.out,
              stagger: 0.08,
              clearProps: "transform",
            }),
        });
      });
    },
    { scope },
  );

  // overflow-x-clip, not hidden: it stops the hero's floating cards from
  // widening the page without turning this into a scroll container, which
  // would break the sticky header inside it.
  return (
    <div ref={scope} data-landing className="relative isolate overflow-x-clip">
      {children}
    </div>
  );
}
