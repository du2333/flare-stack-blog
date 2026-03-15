import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";
import {
  oauthJwtPlugin,
  oauthProviderPlugin,
} from "@/features/oauth-provider/oauth-provider.config";

export const authConfig = {
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
    oauthJwtPlugin,
    oauthProviderPlugin,
  ],
} satisfies BetterAuthOptions;
