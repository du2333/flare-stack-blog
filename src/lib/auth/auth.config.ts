import { apiKey } from "@better-auth/api-key";
import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";

export function createAuthConfig() {
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
    user: {
      additionalFields: {
        mutedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      admin(),
      apiKey({
        enableSessionForAPIKeys: true,
        requireName: true,
        defaultPrefix: "fsb_",
        rateLimit: { enabled: false },
        keyExpiration: {
          defaultExpiresIn: null,
          disableCustomExpiresTime: true,
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}
