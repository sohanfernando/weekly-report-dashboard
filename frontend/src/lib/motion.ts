import gsap from "gsap";

/**
 * Motion tokens.
 *
 * One vocabulary for the whole app, for the same reason the colours are: a
 * panel opening should feel like every other panel opening. Ad-hoc durations
 * are what make an interface feel assembled rather than designed.
 *
 * Durations are short on purpose. Anything past ~400ms stops reading as
 * responsiveness and starts reading as lag, and this is a tool people use all
 * day rather than a landing page.
 */
export const DURATION = {
  /** Micro-feedback: a chevron turning, a row highlighting. */
  instant: 0.18,
  /** The default. Entrances, panel swaps, most state changes. */
  quick: 0.28,
  /** Larger movements: a drawer, a sidebar changing width. */
  base: 0.36,
  /** Only for something big enough that the eye needs time to follow it. */
  slow: 0.52,
} as const;

export const EASE = {
  /** Entrances. Decelerating: fast off the mark, settles gently. */
  out: "power3.out",
  /** Exits. Accelerating away, so leaving feels lighter than arriving. */
  in: "power2.in",
  /** Two-way state changes, where symmetry matters more than snap. */
  inOut: "power2.inOut",
  /** Numbers counting up — linear-ish, so the value stays readable in flight. */
  count: "power1.out",
} as const;

/** Distance travelled by an entering element. Small: motion should hint, not swing. */
export const RISE = 10;

/**
 * Stagger between siblings.
 *
 * Small enough that a list still feels like one gesture rather than a queue.
 * Paired with a total cap so a fifty-row table does not take three seconds to
 * finish arriving.
 */
export const STAGGER = { each: 0.035, amount: 0.28 } as const;

/**
 * True when the visitor has asked the system for less motion.
 *
 * Everything in this app checks it. Reduced motion is an accessibility setting,
 * not a preference to be talked out of: vestibular disorders make large
 * transitions genuinely unpleasant, and some people simply find them
 * distracting.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Runs `build` only when full motion is allowed, and calls `settle` otherwise
 * so reduced-motion users still land on the final visual state rather than on
 * whatever `gsap.set` left behind.
 *
 * Returns the matchMedia instance; GSAP's context cleanup reverts it.
 */
export function withMotion(
  scope: Element | null,
  build: (context: gsap.Context) => void,
  settle?: (context: gsap.Context) => void,
): gsap.MatchMedia {
  const media = gsap.matchMedia(scope ?? undefined);

  media.add("(prefers-reduced-motion: no-preference)", (context) => {
    build(context);
  });

  media.add("(prefers-reduced-motion: reduce)", (context) => {
    if (settle) settle(context);
  });

  return media;
}

/** The resting state for anything that animates in: visible, unmoved. */
export const RESTING = { opacity: 1, y: 0, x: 0, scale: 1, clearProps: "transform" } as const;
