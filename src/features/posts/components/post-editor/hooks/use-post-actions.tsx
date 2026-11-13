import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import type { PostEditorData } from "@/features/posts/components/post-editor/types";
import { FALLBACK_SLUG, slugify } from "@/features/posts/utils/content";
import {
  isValidPostSlug,
  truncateGeneratedSlug,
} from "@/features/posts/utils/post-fields";
import { orpcClient } from "@/lib/orpc";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";
import {
  invalidatePostQueries,
  useUnpublishPost,
} from "../../post-manager/hooks";
import {
  BLOB_UPLOADING_ERROR,
  discardErrorMessage,
  CONTENT_TOO_LARGE_ERROR,
  EDIT_CONFLICT_ERROR,
  editConflictOf,
  publishErrorMessage,
  shouldAutogenerateSlug,
} from "../post-editor.model";
import type { PostState } from "../../post-state";
import type { EditConflict } from "../types";

interface UsePostActionsOptions {
  postId: number;
  post: PostEditorData;
  setPost: React.Dispatch<React.SetStateAction<PostEditorData>>;
  setError: (error: string | null) => void;
  flush: () => Promise<void>;
  /** Whether a save was refused; publishing waits until it is resolved. */
  conflicted: boolean;
  /** Another post uses the slug, so autosave left it out. */
  slugTaken: boolean;
  getSaveToken: () => string;
  acceptSaveToken: (saveToken: string) => void;
  reportConflict: (conflict: EditConflict) => void;
  /** How the post stands now; publishing says what it just made public. */
  state: PostState;
  /** Mounts the editor afresh with the post as stored. */
  reload: () => Promise<void>;
}

export function usePostActions({
  postId,
  post,
  setPost,
  setError,
  flush,
  conflicted,
  slugTaken,
  getSaveToken,
  acceptSaveToken,
  reportConflict,
  state,
  reload,
}: UsePostActionsOptions) {
  const queryClient = useQueryClient();
  const stateRef = useRef(state);
  stateRef.current = state;

  const [processState, setProcessState] = useState<
    "IDLE" | "PROCESSING" | "SUCCESS"
  >("IDLE");

  const canPublish = useMemo(() => {
    if (conflicted) return false;
    // Autosave leaves a slug the API would refuse unsaved, so publishing
    // would put the previous one live.
    if (!isValidPostSlug(post.slug) || slugTaken) return false;
    if (!post.publishedAt) return true;
    return post.publishedAt.toISOString().slice(0, 10) <= post.serverToday;
  }, [conflicted, post.publishedAt, post.serverToday, post.slug, slugTaken]);

  const lastAutoSlugRef = useRef<string | null>(null);
  const queuedTitleRef = useRef<string | null>(null);
  const prevTitleRef = useRef(post.title);
  const isFirstTitleMount = useRef(true);
  const slugGenerationMode = useRef<"manual" | "auto">("manual");
  const latestSlugRef = useRef(post.slug);
  const latestTitleRef = useRef(post.title);
  const publishedRef = useRef(false);
  latestSlugRef.current = post.slug;
  latestTitleRef.current = post.title;
  // `publishedAt` arrives on reload after the first publish and survives an
  // unpublish; `hasPublicSnapshot` covers the session that first publishes.
  publishedRef.current = post.hasPublicSnapshot || post.publishedAt !== null;
  const debouncedTitle = useDebounce(post.title, 500);

  const publishMutation = useMutation({
    mutationFn: () =>
      orpcClient.posts.admin.publish({ id: postId, saveToken: getSaveToken() }),
    onSuccess: (result) => {
      acceptSaveToken(result.saveToken);
      toast.success(
        stateRef.current === "published-changed"
          ? m.editor_toast_published_changes()
          : m.editor_toast_published(),
      );
      setPost((prev) => ({ ...prev, hasPublicSnapshot: true }));
      setProcessState("SUCCESS");
      void invalidatePostQueries(queryClient, postId);
      setTimeout(() => {
        setProcessState("IDLE");
      }, 3000);
    },
    onError: (error) => {
      const found = editConflictOf(error);
      if (found) reportConflict(found);
      else toast.error(publishErrorMessage(error));
      setProcessState("IDLE");
    },
  });

  const { mutate: unpublish } = useUnpublishPost({
    onSuccess: (result) => {
      acceptSaveToken(result.saveToken);
      setPost((prev) => ({ ...prev, hasPublicSnapshot: false }));
      setProcessState("SUCCESS");
      setTimeout(() => {
        setProcessState("IDLE");
      }, 3000);
    },
    onError: () => setProcessState("IDLE"),
  });

  const handlePublish = useCallback(async () => {
    if (processState !== "IDLE") return;
    setProcessState("PROCESSING");
    try {
      await flush();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      // A body too large to save was already explained by the save itself.
      if (
        reason !== EDIT_CONFLICT_ERROR &&
        reason !== CONTENT_TOO_LARGE_ERROR
      ) {
        toast.error(
          reason === BLOB_UPLOADING_ERROR
            ? m.editor_action_image_uploading()
            : m.editor_action_publish_failed(),
        );
      }
      setProcessState("IDLE");
      return;
    }
    publishMutation.mutate();
  }, [flush, processState, publishMutation]);

  const handleUnpublish = useCallback(async () => {
    if (processState !== "IDLE" || conflicted) return;
    setProcessState("PROCESSING");
    // Unpublishing replaces the token too, so edits still waiting go first.
    try {
      await flush();
    } catch (error) {
      if (!(error instanceof Error && error.message === EDIT_CONFLICT_ERROR)) {
        toast.error(m.editor_action_unpublish_failed());
      }
      setProcessState("IDLE");
      return;
    }
    unpublish(postId);
  }, [conflicted, flush, postId, processState, unpublish]);

  const handleDiscard = useCallback(async () => {
    if (processState !== "IDLE" || conflicted) return;
    setProcessState("PROCESSING");
    // Edits still waiting are saved first, so the token stated is the current
    // one and they land in the version kept before the discard.
    try {
      await flush();
    } catch (error) {
      if (!(error instanceof Error && error.message === EDIT_CONFLICT_ERROR)) {
        toast.error(m.editor_action_discard_failed());
      }
      setProcessState("IDLE");
      return;
    }
    let discarded: { saveToken: string };
    try {
      discarded = await orpcClient.posts.admin.discardChanges({
        id: postId,
        saveToken: getSaveToken(),
      });
    } catch (error) {
      const found = editConflictOf(error);
      if (found) reportConflict(found);
      else toast.error(discardErrorMessage(error));
      // Whatever the server refused over, what is shown may be out of date.
      void invalidatePostQueries(queryClient, postId);
      setProcessState("IDLE");
      return;
    }
    acceptSaveToken(discarded.saveToken);
    void invalidatePostQueries(queryClient, postId);
    try {
      await reload();
    } catch {
      toast.error(m.editor_conflict_reload_failed());
      setProcessState("IDLE");
      return;
    }
    toast.success(m.editor_discard_toast_done());
    setProcessState("IDLE");
  }, [
    acceptSaveToken,
    conflicted,
    flush,
    getSaveToken,
    postId,
    processState,
    queryClient,
    reload,
    reportConflict,
  ]);

  const slugMutation = useMutation({
    mutationFn: (title: string) =>
      orpcClient.posts.admin.generateSlug({
        title,
        excludeId: postId,
      }),
    onSuccess: (result) => {
      lastAutoSlugRef.current = result.slug;
      setPost((prev) => ({ ...prev, slug: result.slug }));
      if (slugGenerationMode.current === "manual") {
        toast.success(m.editor_action_slug_set(), {
          description: m.editor_action_slug_set_desc({ slug: result.slug }),
        });
      }
    },
    onSettled: (_data, error) => {
      if (error) {
        console.error("Slug generation failed:", error);
        setError(m.editor_action_slug_error());
        const fallbackSlug =
          truncateGeneratedSlug(slugify(latestTitleRef.current)) ||
          FALLBACK_SLUG;
        lastAutoSlugRef.current = fallbackSlug;
        setPost((prev) => ({ ...prev, slug: fallbackSlug }));
      }
      const queuedTitle = queuedTitleRef.current;
      queuedTitleRef.current = null;
      if (
        queuedTitle &&
        shouldAutogenerateSlug(
          latestSlugRef.current,
          lastAutoSlugRef.current,
          publishedRef.current,
        )
      ) {
        slugGenerationMode.current = "auto";
        slugMutation.mutate(queuedTitle);
      }
    },
  });

  const lockSlug = () => {
    lastAutoSlugRef.current = null;
  };

  useEffect(() => {
    if (isFirstTitleMount.current) {
      isFirstTitleMount.current = false;
      prevTitleRef.current = debouncedTitle;
      return;
    }

    if (debouncedTitle === prevTitleRef.current) {
      return;
    }
    prevTitleRef.current = debouncedTitle;

    if (!debouncedTitle.trim()) {
      return;
    }
    if (
      !shouldAutogenerateSlug(
        latestSlugRef.current,
        lastAutoSlugRef.current,
        publishedRef.current,
      )
    ) {
      return;
    }
    if (slugMutation.isPending) {
      queuedTitleRef.current = debouncedTitle;
      return;
    }
    slugGenerationMode.current = "auto";
    slugMutation.mutate(debouncedTitle);
  }, [debouncedTitle, slugMutation]);

  const handleGenerateSlug = () => {
    if (!post.title.trim()) {
      setError(m.editor_action_title_empty());
      return;
    }
    slugGenerationMode.current = "manual";
    slugMutation.mutate(post.title);
  };

  return {
    isGeneratingSlug: slugMutation.isPending,
    handleGenerateSlug,
    handlePublish,
    handleUnpublish,
    handleDiscard,
    processState,
    canPublish,
    lockSlug,
  };
}
