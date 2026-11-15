import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import {
  draftSide,
  publishedSide,
} from "@/features/posts/components/post-diff/post-diff.sides";
import type { PostDiffSide } from "@/features/posts/components/post-diff/post-diff.types";
import { postMarkdownByIdQuery } from "@/features/posts/queries";

/** What the changes dialog shows. */
export type PostChanges =
  /** The pending edits are being saved, or the post is being read. */
  | { status: "loading" }
  /** The current draft could not be saved, so a diff would lack the input. */
  | { status: "save-failed" }
  /** The post could not be read, or has no published version any more. */
  | { status: "failed" }
  | { status: "ready"; before: PostDiffSide; after: PostDiffSide };

/**
 * The Unpublished Changes of a Published Post, for the editor's changes
 * dialog: the published version against the current draft. Showing them
 * first saves what the editor still holds (`flush`), then reads the post
 * afresh, as Markdown, and builds both sides from that one read, so the draft
 * is what the server has and the input is in it.
 */
export function usePostChanges({
  postId,
  flush,
}: {
  postId: number;
  flush: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState<PostChanges>({ status: "loading" });
  // Each opening is its own request: an answer that comes after the dialog
  // was closed, or opened again, is not shown.
  const requestRef = useRef(0);

  const show = useCallback(async () => {
    const request = ++requestRef.current;
    const settle = (next: PostChanges) => {
      if (request === requestRef.current) setChanges(next);
    };
    setChanges({ status: "loading" });
    setOpen(true);
    try {
      await flush();
    } catch {
      settle({ status: "save-failed" });
      return;
    }
    try {
      const post = await queryClient.fetchQuery({
        ...postMarkdownByIdQuery(postId),
        staleTime: 0,
      });
      const before = post ? publishedSide(post) : null;
      if (!post || !before) {
        settle({ status: "failed" });
        return;
      }
      settle({
        status: "ready",
        before,
        after: draftSide(post, post.tags ?? []),
      });
    } catch {
      settle({ status: "failed" });
    }
  }, [flush, postId, queryClient]);

  const close = useCallback(() => {
    requestRef.current += 1;
    setOpen(false);
  }, []);

  return { open, changes, show, close };
}
