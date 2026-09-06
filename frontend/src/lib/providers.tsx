"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * One QueryClient per browser session, created inside state so it is not shared
 * between requests during server rendering.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The API is the source of truth for a workflow that several people
            // act on, so refetch on focus rather than trusting a stale cache.
            refetchOnWindowFocus: true,
            staleTime: 30 * 1000,
            // A 401 or 403 will not improve on retry; only retry once, for
            // genuine network blips.
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
