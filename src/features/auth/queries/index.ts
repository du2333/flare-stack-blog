import { queryOptions } from "@tanstack/react-query";
import {
  getIsEmailConfiguredFn,
  getSessionFn,
  getUserListFn,
} from "../auth.api";

export const AUTH_KEYS = {
  all: ["auth"] as const,

  // Leaf keys (static arrays - no child queries)
  session: ["auth", "session"] as const,
  emailConfig: ["auth", "email-config"] as const,

  // Child keys (functions for specific queries)
  hasPassword: (userId?: string) => ["auth", "has-password", userId] as const,

  // Admin: 用户列表
  users: ["auth", "users"] as const,
  userList: (page: number, search?: string) =>
    ["auth", "users", page, search ?? ""] as const,
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

export function userListQueryOptions(page: number = 1, search?: string) {
  return queryOptions({
    queryKey: AUTH_KEYS.userList(page, search),
    queryFn: () =>
      getUserListFn({ data: { page, limit: 20, search: search || undefined } }),
  });
}
