import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCommentFn, deleteCommentFn } from "../api/comments.public.api";
import {
  adminDeleteCommentFn,
  moderateCommentFn,
} from "../api/comments.admin.api";
import { COMMENTS_KEYS } from "@/features/comments/queries";

export function useComments(postId?: number) {
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createCommentFn>[0]) => {
      return await createCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "ROOT_COMMENT_NOT_FOUND":
          case "REPLY_TO_COMMENT_NOT_FOUND":
            toast.error("该评论已被删除，请刷新页面");
            return;
          case "INVALID_ROOT_ID":
          case "ROOT_COMMENT_POST_MISMATCH":
          case "REPLY_TO_COMMENT_ROOT_MISMATCH":
          case "ROOT_COMMENT_CANNOT_HAVE_REPLY_TO":
            toast.error("评论结构异常，请刷新页面重试");
            return;
          default: {
            reason satisfies never;
            toast.error("未知错误");
            return;
          }
        }
      }

      // Invalidate both root comments and all replies queries for this post
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.roots(postId),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.repliesLists(postId),
          exact: false,
        });
      }
      // Also invalidate admin view queries
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.admin,
        exact: false,
      });
      // Also invalidate user's own comments list
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.mine,
        exact: false,
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deleteCommentFn>[0]) => {
      return await deleteCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "COMMENT_NOT_FOUND":
            toast.error("删除失败: 评论不存在或已删除");
            return;
          case "PERMISSION_DENIED":
            toast.error("删除失败: 无权限删除该评论");
            return;
          default: {
            reason satisfies never;
            toast.error("删除失败: 未知错误");
            return;
          }
        }
      }

      // Invalidate both root comments and all replies queries for this post
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.roots(postId),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: COMMENTS_KEYS.repliesLists(postId),
          exact: false,
        });
      }
      // NEW: Also invalidate admin view queries
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.admin,
        exact: false,
      });
      // Also invalidate user's own comments list
      queryClient.invalidateQueries({
        queryKey: COMMENTS_KEYS.mine,
        exact: false,
      });
      toast.success("评论已删除");
    },
  });

  return {
    createComment: createCommentMutation.mutateAsync,
    isCreating: createCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeleting: deleteCommentMutation.isPending,
  };
}

export function useAdminComments() {
  const queryClient = useQueryClient();

  const moderateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof moderateCommentFn>[0]) => {
      return await moderateCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("操作失败: 评论不存在");
        return;
      }

      // Invalidate all comment related queries to be safe since moderation
      // affects visibility in both admin and public views
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
      toast.success("审核操作成功");
    },
  });

  const adminDeleteMutation = useMutation({
    mutationFn: async (input: Parameters<typeof adminDeleteCommentFn>[0]) => {
      return await adminDeleteCommentFn(input);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("删除失败: 评论不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: COMMENTS_KEYS.all });
      toast.success("评论已永久删除");
    },
  });

  return {
    moderate: moderateMutation.mutate,
    moderateAsync: moderateMutation.mutateAsync,
    isModerating: moderateMutation.isPending,
    adminDelete: adminDeleteMutation.mutate,
    isAdminDeleting: adminDeleteMutation.isPending,
  };
}
