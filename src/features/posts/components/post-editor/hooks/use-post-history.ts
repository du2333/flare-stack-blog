import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";
import {
  postByIdQuery,
  postMarkdownByIdQuery,
  postRevisionDetailQuery,
  postRevisionListQuery,
  postRevisionMarkdownQuery,
} from "@/features/posts/queries";
import type { PostDiffSide } from "@/features/posts/components/post-diff/post-diff.types";
import { tagsByPostIdQueryOptions } from "@/features/tags/queries";
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

/** What a version is compared with on the history page. */
export type HistoryCompare = "draft" | "previous";

type DraftRead = NonNullable<
  Awaited<ReturnType<typeof orpcClient.posts.admin.get>>
>;

function revisionSide(revision: RevisionDetail): PostDiffSide {
  const { snapshotJson: snapshot, cover } = revision;
  return {
    title: snapshot.title,
    summary: snapshot.summary,
    slug: snapshot.slug,
    publishedAt: snapshot.publishedAt,
    categoryId: snapshot.categoryId,
    tagIds: snapshot.tagIds,
    coverMediaId: snapshot.coverMediaId,
    coverUrl: cover?.url ?? null,
    markdown: snapshot.contentMarkdown ?? null,
  };
}

function draftSide(
  post: DraftRead,
  tags: ReadonlyArray<{ id: number }>,
): PostDiffSide {
  return {
    title: post.title,
    summary: post.summary,
    slug: post.slug,
    publishedAt: post.publishedAt,
    categoryId: post.categoryId,
    tagIds: tags.map((tag) => tag.id),
    coverMediaId: post.coverMediaId,
    coverUrl: post.cover?.url ?? null,
    markdown: post.contentMarkdown ?? null,
  };
}

/** A read that failed, or that found the post or version gone meanwhile. */
function isFailed(query: {
  isError: boolean;
  isSuccess: boolean;
  data: unknown;
}) {
  return query.isError || (query.isSuccess && query.data == null);
}

/**
 * Everything the Changes view of a version needs: against the saved draft
 * (this version first), or against the adjacent older version (that one
 * first), with the sides' names and the text for two equal sides. The oldest
 * version has no older one, so `compare` is "draft" for it whatever was
 * chosen. Nothing is read until `enabled`, so the content view makes no
 * Markdown read.
 */
export function usePostHistoryDiff({
  postId,
  selectedRevisionId,
  revisions,
  compare: chosen,
  enabled,
}: {
  postId: number;
  selectedRevisionId: number | null;
  /** Newest first, as the list returns them. */
  revisions: ReadonlyArray<RevisionListItem>;
  /** The base the Admin chose. */
  compare: HistoryCompare;
  enabled: boolean;
}) {
  const index = revisions.findIndex(
    (revision) => revision.id === selectedRevisionId,
  );
  const previousId = index >= 0 ? revisions[index + 1]?.id : undefined;
  const hasPrevious = previousId != null;
  const compare: HistoryCompare = hasPrevious ? chosen : "draft";
  const againstDraft = compare === "draft";

  const selectedQuery = useQuery({
    ...postRevisionMarkdownQuery(postId, selectedRevisionId ?? 0),
    enabled: enabled && selectedRevisionId != null,
  });
  const draftQuery = useQuery({
    ...postMarkdownByIdQuery(postId),
    enabled: enabled && againstDraft,
    refetchOnMount: "always",
  });
  const draftTagsQuery = useQuery({
    ...tagsByPostIdQueryOptions(postId),
    enabled: enabled && againstDraft,
    refetchOnMount: "always",
  });
  const previousQuery = useQuery({
    ...postRevisionMarkdownQuery(postId, previousId ?? 0),
    enabled: enabled && !againstDraft,
  });

  const queries = againstDraft
    ? [selectedQuery, draftQuery, draftTagsQuery]
    : [selectedQuery, previousQuery];
  const selected = selectedQuery.data ? revisionSide(selectedQuery.data) : null;
  const other = againstDraft
    ? draftQuery.data && draftTagsQuery.data
      ? draftSide(draftQuery.data, draftTagsQuery.data)
      : null
    : previousQuery.data
      ? revisionSide(previousQuery.data)
      : null;

  const names = againstDraft
    ? {
        beforeName: m.editor_history_side_this(),
        afterName: m.editor_history_side_draft(),
        emptyText: m.editor_history_diff_same_draft(),
      }
    : {
        beforeName: m.editor_history_side_previous(),
        afterName: m.editor_history_side_this(),
        emptyText: m.editor_history_diff_same_previous(),
      };
  const sides =
    selected && other
      ? againstDraft
        ? { before: selected, after: other }
        : { before: other, after: selected }
      : null;
  const failed = enabled && queries.some(isFailed);
  return {
    compare,
    hasPrevious,
    /** The props of the diff; null while a read is under way or after one failed. */
    diff: sides && !failed ? { ...sides, ...names } : null,
    isLoading: enabled && sides === null && !failed,
    isError: failed,
  };
}
