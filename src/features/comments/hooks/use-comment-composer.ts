import { useEffect, useState } from "react";
import { createCommentInput, type CommentTarget } from "../comment-target";
import type { CreateCommentInput } from "../comments.schema";

type ReplyTarget = { rootId: number; commentId: number; userName: string };

function focusReplyButton(id?: number) {
  if (id != null) {
    document
      .querySelector<HTMLButtonElement>(`#comment-${id} .comment-reply-button`)
      ?.focus({ preventScroll: true });
  }
}

export function useCommentComposer({
  target,
  userId,
  isCreating,
  createComment,
  challenge,
  onCreated,
}: {
  target: CommentTarget;
  userId?: string;
  isCreating: boolean;
  createComment: (
    input: CreateCommentInput,
  ) => Promise<{ id: number } | null | undefined>;
  challenge: { requireReady: () => void; reset: () => void };
  onCreated: (target: { rootId: number; commentId: number }) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rootOpen, setRootOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  useEffect(() => {
    setDrafts({});
    setReplyTarget(null);
    setRootOpen(false);
  }, [target.type, target.id, userId]);
  const updateDraft = (key: string, value: string) =>
    setDrafts((previous) => ({ ...previous, [key]: value }));

  const startRoot = () => {
    if (isCreating) return;
    setReplyTarget(null);
    setRootOpen(true);
  };
  const startReply = (target: ReplyTarget) => {
    if (isCreating) return;
    setRootOpen(false);
    setReplyTarget(target);
  };
  const cancelRoot = () => {
    setRootOpen(false);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(".comment-new-trigger")
        ?.focus({ preventScroll: true }),
    );
  };
  const cancelReply = () => {
    focusReplyButton(replyTarget?.commentId);
    setReplyTarget(null);
  };
  const submitRoot = async (content: string) => {
    challenge.requireReady();
    try {
      const created = await createComment(
        createCommentInput(target, { content }),
      );
      updateDraft("root", "");
      setRootOpen(false);
      if (created?.id) onCreated({ rootId: created.id, commentId: created.id });
    } finally {
      challenge.reset();
    }
  };
  const submitReply = async (content: string) => {
    if (!replyTarget) return;
    challenge.requireReady();
    try {
      const created = await createComment(
        createCommentInput(target, {
          content,
          rootId: replyTarget.rootId,
          replyToCommentId: replyTarget.commentId,
        }),
      );
      if (created?.id)
        onCreated({ rootId: replyTarget.rootId, commentId: created.id });
      updateDraft(`reply:${replyTarget.commentId}`, "");
      focusReplyButton(replyTarget.commentId);
      setReplyTarget(null);
    } finally {
      challenge.reset();
    }
  };

  return {
    startRoot,
    startReply,
    root: {
      isOpen: rootOpen,
      value: drafts.root ?? "",
      onChange: (value: string) => updateDraft("root", value),
      onCancel: cancelRoot,
      onSubmit: submitRoot,
    },
    reply: {
      target: replyTarget,
      value: replyTarget
        ? (drafts[`reply:${replyTarget.commentId}`] ?? "")
        : "",
      onChange: (value: string) => {
        if (replyTarget) updateDraft(`reply:${replyTarget.commentId}`, value);
      },
      onCancel: cancelReply,
      onSubmit: submitReply,
    },
  };
}
