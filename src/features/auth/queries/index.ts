import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { announceSessionChange } from "@/features/auth/session-broadcast";
import type { Session } from "@/lib/auth/auth.server";
import { orpc } from "@/lib/orpc";

const AUTH_KEYS = {
  session: ["auth", "session"] as const,
};

// Better Auth's JSON carries dates as ISO strings; its client turns every such
// string back into a Date, and so does this, so the session keeps its type.
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/;

function reviveDate(_key: string, value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value)
    ? new Date(value)
    : value;
}

/**
 * Who is signed in, as `GET /api/auth/get-session` answers in the browser.
 * The answer is all a page needs to show the session, so public pages read it
 * without Better Auth's client; the endpoint itself slides the session's
 * expiry and keeps its cookie cache.
 */
export async function fetchSession() {
  const response = await fetch("/api/auth/get-session", {
    headers: { accept: "application/json" },
  });
  // The session vanished while it was being refreshed; Better Auth's client
  // reads this as signed out too.
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Session lookup failed with ${response.status}`);
  }
  const text = await response.text();
  if (!text) return null;
  const session = JSON.parse(text, reviveDate) as Session | null;
  return session?.session && session.user ? session : null;
}

/** The one record of who is signed in, for route guards and components. */
export const sessionQuery = queryOptions({
  queryKey: AUTH_KEYS.session,
  // No abort signal: a lookup a reader stopped waiting for still serves the
  // next one, instead of being cancelled and sent again.
  queryFn: async (): Promise<Session | null> => {
    if (import.meta.env.SSR) {
      const { getRequestSession } =
        await import("@/lib/auth/get-request-session");
      return getRequestSession();
    }
    return fetchSession();
  },
});

export const emailConfiguredQuery = orpc.email.configured.queryOptions();

/**
 * After Better Auth's client signed someone in or out: the session query
 * takes the new answer, other tabs hear of it, and what depended on the old
 * viewer loads again. Signing out needs no lookup; signing in drops the old
 * answer, so a route guard waits for the new one instead of reading it.
 */
export function resetAuthBoundQueries(
  queryClient: QueryClient,
  change: "signed-in" | "signed-out",
) {
  if (change === "signed-out") {
    queryClient.setQueryData(AUTH_KEYS.session, null);
  } else {
    void queryClient.resetQueries({ queryKey: AUTH_KEYS.session });
  }
  announceSessionChange(change);
  void queryClient.invalidateQueries({ queryKey: orpc.comments.key() });
  void queryClient.invalidateQueries({ queryKey: orpc.email.key() });
  void queryClient.invalidateQueries({ queryKey: orpc.friendLinks.mine.key() });
}

/**
 * After the signed-in User changed their profile through Better Auth's
 * client: the session loads again, showing the old one until it arrives.
 */
export function refreshSession(queryClient: QueryClient) {
  announceSessionChange("updateUser");
  return queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session });
}
