import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

/**
 * Inter is the only family in the system. The weights loaded are exactly the
 * ones the design uses: 400 and 500 for body and UI text, 600 for headings,
 * 700 for dashboard metric numbers.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Weekly Reports",
  description: "Weekly work reporting and team review",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      {/*
        Browser extensions write their own attributes onto <body> — Grammarly
        adds data-gr-ext-installed and data-new-gr-c-s-check-loaded — between
        the server HTML arriving and React hydrating it. React then finds
        attributes the server never sent and reports a mismatch that no code
        here can prevent, because nothing here put them there.

        suppressHydrationWarning applies one level deep: it covers this
        element's own attributes and nothing else, so a genuine mismatch
        anywhere inside the app is still reported. That narrowness is the
        reason it belongs here and not higher up.
      */}
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
