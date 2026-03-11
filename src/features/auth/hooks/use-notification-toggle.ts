import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getReplyNotificationStatusFn,
  getUserNotificationAvailabilityFn,
  toggleReplyNotificationFn,
} from "@/features/email/api/email.api";
import { EMAIL_KEYS } from "@/features/email/queries";
import { m } from "@/paraglide/messages";

export function useNotificationToggle(userId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: availability,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
  } = useQuery({
    queryKey: [...EMAIL_KEYS.notifications, "availability", userId],
    queryFn: () => getUserNotificationAvailabilityFn(),
    enabled: !!userId,
  });
  const {
    data: notificationStatus,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: EMAIL_KEYS.replyNotification(userId),
    queryFn: () => getReplyNotificationStatusFn(),
    enabled: !!userId,
  });
  const currentEnabled = notificationStatus?.enabled;

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleReplyNotificationFn({ data: { enabled } }),
    onSuccess: (_result, enabled) => {
      queryClient.setQueryData(EMAIL_KEYS.replyNotification(userId), {
        enabled,
      });
      toast.success(
        enabled
          ? m.profile_notify_enabled_fuwari()
          : m.profile_notify_disabled_fuwari(),
      );
    },
  });

  return {
    available: availability?.emailEnabled ?? false,
    enabled: currentEnabled,
    isLoading: isLoading || isAvailabilityLoading,
    isPending: mutation.isPending,
    toggle: () => {
      if (isLoading || isAvailabilityLoading) {
        toast.message(m.profile_notify_status_loading());
        return;
      }
      if (queryError || availabilityError) {
        toast.error(m.profile_notify_status_failed());
        return;
      }
      if (!availability?.emailEnabled) {
        toast.message(m.profile_notify_unavailable());
        return;
      }
      if (currentEnabled === undefined) {
        toast.error(m.profile_notify_invalid_state());
        return;
      }
      mutation.mutate(!currentEnabled);
    },
  };
}

export type UseNotificationToggleReturn = ReturnType<
  typeof useNotificationToggle
>;
