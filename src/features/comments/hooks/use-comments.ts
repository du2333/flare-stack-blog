import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleORPCError } from "@/lib/orpc/error-handler";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { CommentTarget } from "../comment-target";
import { MOMENTS_QUERY_KEY } from "@/features/moments/queries";
import { commentViewKeys } from "../queries";
import type {
  CreateCommentInput,
  DeleteCommentInput,
} from "../comments.schema";

function invalidateCommentViews(
  queryClient: ReturnType<typeof useQueryClient>,
  target?: CommentTarget,
) {
  return Promise.all([
    ...(target
      ? commentViewKeys(target).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        )
      : []),
    // A Moment is read with its comment count, so a Comment changes it too.
    ...(target?.type === "moment"
      ? [queryClient.invalidateQueries({ queryKey: MOMENTS_QUERY_KEY })]
      : []),
    queryClient.invalidateQueries({ queryKey: orpc.comments.mine.key() }),
  ]);
}

export function useComments(
  target?: CommentTarget,
  options: { onMuted?: () => void } = {},
) {
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation({
    // A Moment's Comments are created under the Moment's path.
    mutationFn: (input: CreateCommentInput) =>
      "momentId" in input
        ? orpcClient.comments.moment.create(input)
        : orpcClient.comments.create(input),
    onSuccess: async () => {
      await invalidateCommentViews(queryClient, target);
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          USER_MUTED: () => {
            options.onMuted?.();
            toast.error(m.comments_toast_muted());
          },
          NAME_REQUIRED: () => {
            toast.error(m.comments_toast_name_required());
          },
          ROOT_COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_deleted_refresh());
          },
          REPLY_TO_COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_deleted_refresh());
          },
          INVALID_ROOT_ID: () => {
            toast.error(m.comments_toast_structure_error());
          },
          ROOT_COMMENT_POST_MISMATCH: () => {
            toast.error(m.comments_toast_structure_error());
          },
          REPLY_TO_COMMENT_ROOT_MISMATCH: () => {
            toast.error(m.comments_toast_structure_error());
          },
          ROOT_COMMENT_CANNOT_HAVE_REPLY_TO: () => {
            toast.error(m.comments_toast_structure_error());
          },
          POST_NOT_PUBLISHED: () => {
            toast.error(m.comments_toast_unknown_error());
          },
          POST_NOT_FOUND: () => {
            toast.error(m.comments_toast_unknown_error());
          },
          MOMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_unknown_error());
          },
        },
        fallback: () => {
          toast.error(m.comments_toast_unknown_error());
        },
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (input: DeleteCommentInput) =>
      orpcClient.comments.remove(input),
    onSuccess: async () => {
      await invalidateCommentViews(queryClient, target);
      toast.success(m.comments_toast_delete_success());
    },
    onError: (error) => {
      handleORPCError(error, {
        defined: {
          COMMENT_NOT_FOUND: () => {
            toast.error(m.comments_toast_delete_not_found());
          },
          FORBIDDEN: () => {
            toast.error(m.comments_toast_delete_denied());
          },
        },
        fallback: () => {
          toast.error(m.comments_toast_delete_error());
        },
      });
    },
  });

  return {
    createComment: createCommentMutation.mutateAsync,
    isCreating: createCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    isDeleting: deleteCommentMutation.isPending,
  };
}
