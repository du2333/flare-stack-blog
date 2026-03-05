import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getReplyNotificationStatusFn,
  toggleReplyNotificationFn,
} from "@/features/email/email.api";
import { EMAIL_KEYS } from "@/features/email/queries";

export function useNotificationToggle(userId: string | undefined) {
  const queryClient = useQueryClient();

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
    enabled: currentEnabled,
    isLoading,
    isPending: mutation.isPending,
    toggle: () => {
      if (isLoading) {
        toast.message("正在获取通知状态，请稍候");
        return;
      }
      if (queryError) {
        toast.error("获取通知状态失败，请重试");
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
