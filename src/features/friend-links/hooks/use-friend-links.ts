import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { submitFriendLinkFn } from "../api/friend-links.user.api";
import {
  approveFriendLinkFn,
  createFriendLinkFn,
  deleteFriendLinkFn,
  rejectFriendLinkFn,
  updateFriendLinkFn,
} from "../api/friend-links.admin.api";
import { FRIEND_LINKS_KEYS } from "../queries";

export function useFriendLinks() {
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async (input: Parameters<typeof submitFriendLinkFn>[0]) => {
      return await submitFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("该站点URL已提交过申请");
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.mine });
      toast.success("友链申请已提交", {
        description: "管理员审核后将通过邮件通知您。",
      });
    },
  });

  return {
    submit: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
  };
}

export function useAdminFriendLinks() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createFriendLinkFn>[0]) => {
      return await createFriendLinkFn(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已添加");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof updateFriendLinkFn>[0]) => {
      return await updateFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("更新失败: 友链不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已更新");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (input: Parameters<typeof approveFriendLinkFn>[0]) => {
      return await approveFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("操作失败: 友链不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已批准");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (input: Parameters<typeof rejectFriendLinkFn>[0]) => {
      return await rejectFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("操作失败: 友链不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已拒绝");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteFriendLinkFn>[0]) => {
      return await deleteFriendLinkFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("删除失败: 友链不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已永久删除");
    },
  });

  return {
    create: createMutation.mutate,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    approve: approveMutation.mutate,
    approveAsync: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutate,
    rejectAsync: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    adminDelete: deleteMutation.mutate,
    isAdminDeleting: deleteMutation.isPending,
  };
}
