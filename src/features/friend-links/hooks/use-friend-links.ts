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
      const result = await submitFriendLinkFn(input);
      if (result.error) {
        throw new Error(
          { DUPLICATE_URL: "该站点URL已提交过申请" }[result.error.reason],
        );
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.mine });
      toast.success("友链申请已提交", {
        description: "管理员审核后将通过邮件通知您。",
      });
    },
    onError: (error) => {
      toast.error(error.message);
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
      const result = await createFriendLinkFn(input);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已添加");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof updateFriendLinkFn>[0]) => {
      const result = await updateFriendLinkFn(input);
      if (result.error) {
        throw new Error("友链不存在");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已更新");
    },
    onError: (error) => toast.error("更新失败: " + error.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (input: Parameters<typeof approveFriendLinkFn>[0]) => {
      const result = await approveFriendLinkFn(input);
      if (result.error) {
        throw new Error("友链不存在");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已批准");
    },
    onError: (error) => toast.error("操作失败: " + error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (input: Parameters<typeof rejectFriendLinkFn>[0]) => {
      const result = await rejectFriendLinkFn(input);
      if (result.error) {
        throw new Error("友链不存在");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已拒绝");
    },
    onError: (error) => toast.error("操作失败: " + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteFriendLinkFn>[0]) => {
      const result = await deleteFriendLinkFn(input);
      if (result.error) {
        throw new Error("友链不存在");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FRIEND_LINKS_KEYS.all });
      toast.success("友链已永久删除");
    },
    onError: (error) => toast.error("删除失败: " + error.message),
  });

  return {
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    reject: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    adminDelete: deleteMutation.mutateAsync,
    isAdminDeleting: deleteMutation.isPending,
  };
}
