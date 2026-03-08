import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getReplyNotificationStatusFn,
  getUserNotificationAvailabilityFn,
  toggleReplyNotificationFn,
} from "@/features/email/api/email.api";
import { EMAIL_KEYS } from "@/features/email/queries";

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
      toast.success(enabled ? "已开启通知" : "已关闭通知");
    },
  });

  return {
    available: availability?.emailEnabled ?? false,
    enabled: currentEnabled,
    isLoading: isLoading || isAvailabilityLoading,
    isPending: mutation.isPending,
    toggle: () => {
      if (isLoading || isAvailabilityLoading) {
        toast.message("正在获取通知状态，请稍候");
        return;
      }
      if (queryError || availabilityError) {
        toast.error("获取通知状态失败，请重试");
        return;
      }
      if (!availability?.emailEnabled) {
        toast.message("站点未开启用户邮件通知");
        return;
      }
      if (currentEnabled === undefined) {
        toast.error("通知状态异常，请刷新后重试");
        return;
      }
      mutation.mutate(!currentEnabled);
    },
  };
}

export type UseNotificationToggleReturn = ReturnType<
  typeof useNotificationToggle
>;
