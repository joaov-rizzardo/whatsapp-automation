"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/get-query-client";

/**
 * Client-side providers mounted in RootLayout. Holds the React Query client —
 * the first client-side data layer in the app (spec 003). Auth and organizations
 * deliberately stay on Better Auth's own hooks, not React Query.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
