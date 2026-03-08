import { queryOptions } from "@tanstack/react-query";
import { getReplyNotificationStatusFn } from "@/features/email/api/email.api";

export const EMAIL_KEYS = {
  all: ["email"] as const,

  // Parent keys (static arrays for prefix invalidation)
  notifications: ["email", "notifications"] as const,

  // Child keys (functions for specific queries)
  replyNotification: (userId?: string) =>
    ["email", "notifications", "reply", userId] as const,
  unsubscribe: (params: Record<string, string>) =>
    ["email", "unsubscribe", params] as const,
};

export function replyNotificationStatusQuery(userId?: string) {
  return queryOptions({
    queryKey: EMAIL_KEYS.replyNotification(userId),
    queryFn: () => getReplyNotificationStatusFn(),
    enabled: !!userId,
  });
}
