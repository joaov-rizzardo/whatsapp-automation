import { isServer, QueryClient } from "@tanstack/react-query";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // staleTime above 0 so the client doesn't refetch immediately after
      // hydration. The connection screen overrides this with a short
      // refetchInterval while connecting.
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Never share a QueryClient across requests: on the server make a new one every
 * time; in the browser reuse a singleton (so a React suspend on first render
 * doesn't recreate it).
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
