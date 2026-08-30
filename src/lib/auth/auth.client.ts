import { apiKeyClient } from "@better-auth/api-key/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [adminClient(), apiKeyClient()],
});

export type BetterAuthErrorCode = keyof typeof authClient.$ERROR_CODES;
