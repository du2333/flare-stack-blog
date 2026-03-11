import type { BetterAuthOptions } from "better-auth";
import { admin } from "better-auth/plugins";

export const authConfig = {
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [admin()],
} satisfies BetterAuthOptions;
