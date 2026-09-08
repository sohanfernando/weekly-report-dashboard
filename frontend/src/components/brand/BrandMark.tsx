/**
 * The favicon tile as an inline component, not an `<img>`.
 *
 * It is six flat rects — smaller than the HTTP request a favicon.ico fetch
 * would cost — and inlining means it renders in fixed brand colours reliably
 * wherever it lands: the dark auth panel, and the compact brand row the auth
 * pages themselves show below the lg breakpoint, where that panel is hidden
 * and nothing else on the page asserts the brand.
 *
 * Shared rather than redefined per call site, because a second copy is
 * exactly the kind of drift that turns into "wait, why are there two
 * favicons" a year from now.
 */
export function BrandMark({ className = "size-8 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#4F46E5" />
      <rect x="8" y="9" width="16" height="4" rx="2" fill="#FFFFFF" />
      <rect x="8" y="16" width="16" height="4" rx="2" fill="#FFFFFF" />
      <rect x="8" y="23" width="9" height="4" rx="2" fill="#10B981" />
    </svg>
  );
}
