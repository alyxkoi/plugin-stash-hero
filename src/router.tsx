import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function statusOf(error: unknown): number | undefined {
  const e = error as { status?: number; statusCode?: number; code?: string } | null;
  if (!e) return undefined;
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  const numeric = Number(e.code);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Serve cached data instantly when moving between tabs/pages.
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        // Focus refetches are silent/background only — never a blocking reload.
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const status = statusOf(error);
          // Don't hammer real client errors (except auth, retried once after refresh).
          if (status && status >= 400 && status < 500) return status === 401 && failureCount < 1;
          return failureCount < 1;
        },
        retryDelay: 400,
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
