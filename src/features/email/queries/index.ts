import { orpc } from "@/lib/orpc";
import type { EmailUnsubscribeType } from "@/lib/db/schema";

export function replyNotificationStatusQuery(enabled: boolean) {
  return orpc.email.replyStatus.queryOptions({
    enabled,
  });
}

export function notificationAvailabilityQuery(enabled: boolean) {
  return orpc.email.availability.queryOptions({ enabled });
}

export function hasPasswordQuery(enabled: boolean) {
  return orpc.email.hasPassword.queryOptions({ enabled });
}

export function unsubscribeQuery(
  input: { userId: string; type: EmailUnsubscribeType; token: string },
  enabled: boolean,
) {
  return orpc.email.unsubscribe.queryOptions({
    input,
    retry: false,
    enabled,
  });
}
