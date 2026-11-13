import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";
import {
  postByIdQuery,
  postRevisionDetailQuery,
  postRevisionListQuery,
} from "@/features/posts/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import {
  getDeleteErrorMessage,
  type RestoreFailure,
  restoreFailureOf,
  type RevisionDetail,
  type RevisionListItem,
} from "../post-editor-history.shared";

function invalidatePostEditorQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: number,
) {
  const queryKeys = [
    orpc.posts.admin.get.key({ input: { id: postId } }),
    orpc.posts.list.key(),
    orpc.posts.admin.list.key(),
    orpc.posts.admin.revisions.key(),
    orpc.tags.admin.key(),
    orpc.categories.key(),
    orpc.media.linkedKeys.key(),
  ];

  return Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
      }),
    ),
  );
}

export function usePostHistory({
  postId,
  selectedRevisionId,
  onRestored,
  onDeleted,
}: {
  postId: number;
  selectedRevisionId: number | null;
  onRestored: () => void;
  onDeleted: (nextRevisionId: number | null) => void;
}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<null | "restore" | "delete">(null);
  const [restoreFailure, setRestoreFailure] = useState<RestoreFailure | null>(
    null,
  );

  // The post as the editor last saved it, or as this page read it: its
  // saveToken is what a restore states.
  const postQuery = useQuery(postByIdQuery(postId));

  const revisionsQuery = useQuery({
    ...postRevisionListQuery(postId),
    refetchOnMount: "always",
  });

  const selectedRevisionQuery = useQuery({
    ...postRevisionDetailQuery(postId, selectedRevisionId ?? 0),
    enabled: selectedRevisionId != null,
    refetchOnMount: "always",
  });

  const revisions: Array<RevisionListItem> = revisionsQuery.data ?? [];
  const selectedRevision: RevisionDetail | null =
    selectedRevisionQuery.data ?? null;

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (selectedRevisionId == null) {
        throw new Error("REVISION_NOT_SELECTED");
      }
      await orpcClient.posts.admin.revisions.restore({
        postId,
        revisionId: selectedRevisionId,
        saveToken: postQuery.data?.saveToken,
      });
    },
    onSuccess: async () => {
      // The editor opens next and needs the restore's new saveToken, so its
      // cached read must not be served again.
      queryClient.removeQueries({
        queryKey: orpc.posts.admin.get.key({ input: { id: postId } }),
      });
      await invalidatePostEditorQueries(queryClient, postId);
      const title =
        selectedRevision?.snapshotJson.title.trim() || m.common_untitled();
      toast.success(m.editor_history_toast_restore_success(), {
        description: m.editor_history_toast_restore_success_desc({
          title,
        }),
      });
      setConfirm(null);
      onRestored();
    },
    onError: async (error) => {
      // The confirmation closes so the reason is not left behind it, and
      // restoring again takes another confirmation.
      const failure = restoreFailureOf(error, selectedRevisionId);
      setRestoreFailure(failure);
      setConfirm(null);
      if (failure.editConflict) {
        // Read the post again, so restoring anyway states its current token.
        await queryClient.invalidateQueries({
          queryKey: orpc.posts.admin.get.key({ input: { id: postId } }),
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (selectedRevisionId == null) {
        throw new Error("REVISION_NOT_SELECTED");
      }
      return await orpcClient.posts.admin.revisions.remove({
        postId,
        revisionIds: [selectedRevisionId],
      });
    },
    onSuccess: async (result) => {
      const deletedCurrent =
        selectedRevisionId != null &&
        result.deletedIds.includes(selectedRevisionId);
      await invalidatePostEditorQueries(queryClient, postId);
      toast.success(m.editor_history_toast_delete_success(), {
        description: m.editor_history_toast_delete_success_desc(),
      });
      setConfirm(null);
      if (deletedCurrent) {
        const remaining = revisions.filter(
          (revision) => !result.deletedIds.includes(revision.id),
        );
        onDeleted(remaining[0]?.id ?? null);
      }
    },
    onError: (error) => {
      setConfirm(null);
      toast.error(m.editor_history_toast_delete_failed(), {
        description: getDeleteErrorMessage(error.message),
      });
    },
  });

  const requestRestore = useCallback(() => {
    if (selectedRevisionId == null) return;
    setConfirm("restore");
  }, [selectedRevisionId]);

  const requestDelete = useCallback(() => {
    if (selectedRevisionId == null) return;
    setConfirm("delete");
  }, [selectedRevisionId]);

  const cancelConfirm = useCallback(() => setConfirm(null), []);

  return {
    revisions,
    isListLoading: revisionsQuery.isLoading,
    selectedRevision,
    isRevisionLoading: selectedRevisionQuery.isLoading,
    isRestoring: restoreMutation.isPending,
    isDeleting: deleteMutation.isPending,
    confirm,
    // Only what was refused for the version being viewed.
    restoreFailure:
      restoreFailure?.revisionId === selectedRevisionId ? restoreFailure : null,
    requestRestore,
    requestDelete,
    cancelConfirm,
    confirmRestore: restoreMutation.mutate,
    confirmDelete: deleteMutation.mutate,
  };
}
