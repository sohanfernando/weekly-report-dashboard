"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/queries";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#tour", label: "Product tour" },
  { href: "#workflow", label: "How it works" },
  { href: "#roles", label: "Who it’s for" },
];

const PRIMARY =
  "group inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 text-sm font-semibold " +
  "text-brand-foreground shadow-sm shadow-brand/30 transition hover:bg-brand-hover hover:shadow-md " +
  "hover:shadow-brand/30";

/**
 * The landing page's top bar.
 *
 * Transparent over the hero, then frosted once the page moves, so it never
 * sits as a hard white strip across the hero's colour. The sign-in buttons
 * turn into one "Open workspace" link for someone who already has a session.
 */
export function LandingNav() {
  const { data: user, isPending } = useMe();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-border bg-surface/80 backdrop-blur-lg" : "border-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Weekly Reports home">
          <BrandMark className="size-8 shrink-0" />
          {/* The mark alone on phones: with the name, the two buttons wrap. */}
          <span className="text-lg font-bold text-primary max-sm:hidden">Weekly Reports</span>
        </Link>

        {/* lg, not md: at 768px the four links wrap onto two lines each. */}
        <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-secondary transition-colors
                           hover:bg-brand/5 hover:text-brand"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Invisible rather than absent while the session probe runs, so the
            bar does not change width when the answer arrives. */}
        <div className={cn("ml-auto flex items-center gap-1 lg:ml-0", isPending && "invisible")}>
          {user ? (
            <Link href={user.role === "MANAGER" ? "/dashboard" : "/reports"} className={PRIMARY}>
              Open workspace
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-primary
                           transition-colors hover:bg-primary/5"
              >
                Sign in
              </Link>
              <Link href="/register" className={PRIMARY}>
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
