import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth.client";
import { orpc } from "@/lib/orpc";

export const AUTH_KEYS = {
  session: ["auth", "session"] as const,
};

export const sessionQuery = queryOptions({
  queryKey: AUTH_KEYS.session,
  queryFn: async () => {
    if (import.meta.env.SSR) {
      const { getRequestSession } =
        await import("@/lib/auth/get-request-session");
      return getRequestSession();
    }
    const result = await authClient.getSession();
    return result.data ?? null;
  },
});

export const emailConfiguredQuery = orpc.email.configured.queryOptions();

export function resetAuthBoundQueries(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: AUTH_KEYS.session });
  queryClient.invalidateQueries({ queryKey: orpc.comments.key() });
  queryClient.invalidateQueries({ queryKey: orpc.email.key() });
  queryClient.invalidateQueries({ queryKey: orpc.friendLinks.mine.key() });
}
