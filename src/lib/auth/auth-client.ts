import { apiKeyClient } from "@better-auth/api-key/client";
import { createClientOnlyFn } from "@tanstack/react-start";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function createBrowserAuthClient() {
  return createAuthClient({
    plugins: [adminClient(), apiKeyClient(), emailOTPClient()],
  });
}

type AuthClient = ReturnType<typeof createBrowserAuthClient>;

let authClient: AuthClient | undefined;

// The Start compiler drops the client implementations from the Worker build,
// and with them Better Auth's browser client, which SSR has no use for.

/**
 * Better Auth's browser client, for what acts on the session: signing in and
 * out, profile changes, API keys. Reading the session goes through
 * `useSession` in `@/features/auth/hooks/use-session`, so a page that only
 * shows it never loads this client; an action tells that query afterwards
 * (`resetAuthBoundQueries`, `refreshSession`).
 */
export const getAuthClient = createClientOnlyFn((): AuthClient => {
  authClient ??= createBrowserAuthClient();
  return authClient;
});

export type BetterAuthErrorCode = keyof AuthClient["$ERROR_CODES"];
