import { Check, Trash2, Undo2, UserCheck, UserX } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import type { ActionMenuItem } from "@/components/ui/action-menu";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  commentTargetOf,
  createCommentInput,
} from "@/features/comments/comment-target";
import type { AdminComment } from "@/features/comments/comments.schema";
import { CommentEditor } from "@/features/comments/components/comment-editor";
import { CommentReveal } from "@/features/comments/components/comment-reveal";
import {
  useAdminCommentActions,
  useRefreshAdminComments,
} from "@/features/comments/hooks/use-admin-comment-actions";
import { useComments } from "@/features/comments/hooks/use-comments";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import { useMediaQuery } from "@/hooks/use-motion";
import { useSession } from "@/lib/auth/auth-client";
import { m } from "@/paraglide/messages";
import { AdminCommentRow, authorName } from "./admin-comment-row";
import "@/features/comments/components/comments.css";

type PendingAction =
  | { kind: "delete"; comment: AdminComment }
  | { kind: "mute" | "unmute"; comment: AdminComment; userId: string };

export const PHONE_QUERY = "(max-width: 767px)";

/**
 * The Comments page's rows and what they do: reply in place under the row
 * (as the Admin, which handles the Comment), mark handled or undo it, delete
 * and mute or unmute the author, the last three after a confirmation. Every
 * action reloads the page and the unreplied counts.
 */
export function AdminCommentList({
  comments,
  fallbackFocus,
}: {
  comments: Array<AdminComment>;
  /** Takes focus when the focused row leaves the list. */
  fallbackFocus: () => HTMLElement | null;
}) {
  const { data: session } = useSession();
  const phone = useMediaQuery(PHONE_QUERY);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const replying = comments.find((comment) => comment.id === replyingId);
  const target = pending?.comment ?? replying;
  const targetPage = target ? commentTargetOf(target) : undefined;
  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(targetPage);
  const { muteUser, unmuteUser, isMuting, isUnmuting } = useMutedUsers(
    targetPage,
    { linkMutedList: true },
  );
  const { markHandled, unmarkHandled } = useAdminCommentActions();
  const refresh = useRefreshAdminComments();
  const {
    isPending: challengePending,
    reset: resetChallenge,
    turnstileProps,
  } = useTurnstile("comment");
  const compactChallenge = useMediaQuery("(max-width: 380px)");
  const returnFocus = () =>
    trigger.current?.isConnected ? trigger.current : fallbackFocus();

  const closeReply = () => {
    setReplyingId(null);
    trigger.current?.focus({ preventScroll: true });
  };
  const submitReply = async (content: string) => {
    if (!replying) return;
    try {
      await createComment(
        createCommentInput(commentTargetOf(replying), {
          content,
          rootId: replying.rootId ?? replying.id,
          replyToCommentId: replying.id,
        }),
      );
      setDrafts(({ [replying.id]: _sent, ...rest }) => rest);
      setReplyingId(null);
      returnFocus()?.focus({ preventScroll: true });
      toast.success(m.admin_comments_reply_sent());
      void refresh();
    } finally {
      resetChallenge();
    }
  };
  const confirmPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === "delete") {
        await deleteComment({ id: pending.comment.id });
        if (replyingId === pending.comment.id) setReplyingId(null);
      } else if (pending.kind === "mute") {
        await muteUser({ userId: pending.userId });
      } else {
        await unmuteUser({ userId: pending.userId });
      }
    } catch {
      // The hook has said what went wrong; the dialog stays for a retry.
      return;
    }
    setPending(null);
    await refresh();
  };

  const actionsFor = (comment: AdminComment) => {
    const items: Array<ActionMenuItem> = [];
    if (comment.awaitingReply)
      items.push({
        label: m.admin_comments_mark_handled(),
        icon: Check,
        onSelect: () => {
          if (replyingId === comment.id) setReplyingId(null);
          markHandled(comment.id);
        },
      });
    else if (comment.handled && !comment.answered)
      items.push({
        label: m.admin_comments_unmark_handled(),
        icon: Undo2,
        onSelect: () => unmarkHandled(comment.id),
      });
    items.push({
      label: m.comments_item_delete(),
      icon: Trash2,
      danger: true,
      separator: items.length > 0,
      onSelect: (button) => {
        trigger.current = button;
        setPending({ kind: "delete", comment });
      },
    });
    const userId = comment.author.id;
    if (userId && userId !== session?.user.id && !comment.author.isAdmin)
      items.push(
        comment.author.muted
          ? {
              label: m.admin_comments_unmute(),
              icon: UserCheck,
              onSelect: (button) => {
                trigger.current = button;
                setPending({ kind: "unmute", comment, userId });
              },
            }
          : {
              label: m.admin_comments_mute(),
              icon: UserX,
              danger: true,
              onSelect: (button) => {
                trigger.current = button;
                setPending({ kind: "mute", comment, userId });
              },
            },
      );
    return items;
  };

  const pendingName = pending ? authorName(pending.comment) : "";
  return (
    <>
      <ul className="admin-comment-list">
        {comments.map((comment) => {
          // A Post that is not public takes no Comments, so no reply either.
          const canReply =
            comment.commentPath !== null && !comment.author.isAdmin;
          return (
            <AdminCommentRow
              key={comment.id}
              comment={comment}
              actions={actionsFor(comment)}
              replying={replyingId === comment.id}
              replyInMenu={phone}
              onReply={
                canReply
                  ? (button) => {
                      trigger.current = button;
                      setReplyingId((current) =>
                        current === comment.id ? null : comment.id,
                      );
                    }
                  : null
              }
            >
              <CommentReveal open={replyingId === comment.id}>
                <div className="admin-comment-editor">
                  <CommentEditor
                    value={drafts[comment.id] ?? ""}
                    onChange={(value) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [comment.id]: value,
                      }))
                    }
                    onSubmit={submitReply}
                    isSubmitting={isCreating}
                    challengePending={challengePending}
                    autoFocus
                    onCancel={closeReply}
                    submitLabel={m.comments_editor_submit_reply()}
                    label={m.comments_item_reply_to({
                      name: authorName(comment),
                    })}
                    challenge={
                      <Turnstile
                        {...turnstileProps}
                        size={compactChallenge ? "compact" : "normal"}
                      />
                    }
                  />
                </div>
              </CommentReveal>
            </AdminCommentRow>
          );
        })}
      </ul>
      <ConfirmationModal
        isOpen={pending?.kind === "delete"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_delete_title()}
        message={m.comments_delete_desc()}
        confirmLabel={m.comments_delete_confirm()}
        isDanger
        isLoading={isDeleting}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={pending?.kind === "mute"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_mute_title()}
        message={m.comments_mute_desc({ name: pendingName })}
        confirmLabel={m.comments_mute_confirm()}
        isDanger
        isLoading={isMuting}
        returnFocus={returnFocus}
      />
      <ConfirmationModal
        isOpen={pending?.kind === "unmute"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_unmute_title()}
        message={m.comments_unmute_desc({ name: pendingName })}
        confirmLabel={m.comments_unmute_confirm()}
        isLoading={isUnmuting}
        returnFocus={returnFocus}
      />
    </>
  );
}
