import { queryOptions } from "@tanstack/react-query";
import { getIsEmailConfiguredFn, getSessionFn } from "../api/auth.api";

export const AUTH_KEYS = {
  all: ["auth"] as const,

  // Leaf keys (static arrays - no child queries)
  session: ["auth", "session"] as const,
  emailConfig: ["auth", "email-config"] as const,

  // Child keys (functions for specific queries)
  hasPassword: (userId?: string) => ["auth", "has-password", userId] as const,
};

export const sessionQuery = queryOptions({
  queryKey: AUTH_KEYS.session,
  queryFn: async () => {
    const session = await getSessionFn();
    return session;
  },
});

export const emailConfiguredQuery = queryOptions({
  queryKey: AUTH_KEYS.emailConfig,
  queryFn: async () => {
    const isEmailConfigured = await getIsEmailConfiguredFn();
    return isEmailConfigured;
  },
});
