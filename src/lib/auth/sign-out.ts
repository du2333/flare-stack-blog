import type { AuthClientErrorLike } from "@/lib/auth/auth-errors";

/**
 * Signs out with the one request Better Auth's client sends for `signOut()`:
 * a same-origin `POST /api/auth/sign-out` with an empty JSON body. Its client
 * adds nothing a page here relies on (its session store is not used, and the
 * tabs are told by `resetAuthBoundQueries`), so signing out needs neither its
 * code nor a chunk that a tab open across a deploy may no longer find.
 */
export async function signOut(): Promise<{
  error: AuthClientErrorLike | null;
}> {
  try {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (response.ok) return { error: null };
    // Better Auth and the rate limit both answer `{ code, ... }`.
    const body = (await response.json().catch(() => null)) as {
      code?: unknown;
      retryAfterMs?: unknown;
    } | null;
    return {
      error: {
        code: typeof body?.code === "string" ? body.code : null,
        retryAfterMs:
          typeof body?.retryAfterMs === "number" ? body.retryAfterMs : null,
      },
    };
  } catch {
    return { error: {} };
  }
}
