import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";
import {
  createOAuthJwtPlugin,
  createOAuthProviderPlugin,
} from "@/features/oauth-provider/oauth-provider.config";

export function createAuthConfig(baseURL: string) {
  return {
    emailAndPassword: {
      enabled: true,
    },
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    plugins: [
      admin(),
      createOAuthJwtPlugin(baseURL),
      createOAuthProviderPlugin(baseURL),
    ],
  } satisfies BetterAuthOptions;
}
