import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getReplyNotificationStatusFn,
  toggleReplyNotificationFn,
} from "@/features/email/email.api";
import { EMAIL_KEYS } from "@/features/email/queries";

export function useNotificationToggle(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: notificationStatus, isLoading } = useQuery({
    queryKey: EMAIL_KEYS.replyNotification(userId),
    queryFn: () => getReplyNotificationStatusFn(),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleReplyNotificationFn({ data: { enabled } }),
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(EMAIL_KEYS.replyNotification(userId), {
        enabled,
      });
      toast.success(enabled ? "已开启通知" : "已关闭通知");
    },
    onError: () => {
      toast.error("操作失败，请重试");
    },
  });

  return {
    enabled: notificationStatus?.enabled,
    isLoading,
    isPending: mutation.isPending,
    toggle: () => mutation.mutate(!notificationStatus?.enabled),
  };
}

export type UseNotificationToggleReturn = ReturnType<
  typeof useNotificationToggle
>;
