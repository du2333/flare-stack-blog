import { useQueryClient } from "@tanstack/react-query";
import { ClientOnly, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  MessageSquareReply,
  Trash2,
  UserX,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import {
  commentTargetOf,
  createCommentInput,
} from "@/features/comments/comment-target";
import { CommentConfirmationModal } from "@/features/comments/components/comment-confirmation-modal";
import { CommentEditor } from "@/features/comments/components/comment-editor";
import { CommentReveal } from "@/features/comments/components/comment-reveal";
import { useComments } from "@/features/comments/hooks/use-comments";
import type { DashboardComment } from "@/features/dashboard/dashboard.schema";
import { refreshUnrepliedComments } from "@/features/dashboard/hooks/use-handled-comments";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import { useMediaQuery } from "@/hooks/use-motion";
import { useSession } from "@/lib/auth/auth-client";
import { formatTimeAgo } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "@/features/comments/components/comments.css";
import { DashboardIdentity } from "./dashboard-identity";

type PendingAction =
  | { kind: "delete"; comment: DashboardComment }
  | { kind: "mute"; comment: DashboardComment; userId: string };

/**
 * Unreplied Comments as rows, each with a link to its Post or Moment (a
 * Moment is marked, and named by its text) and quick actions:
 * reply inline, mark handled, delete, mute the commenter. A handled, replied
 * or deleted Comment leaves the list when the dashboard queries reload.
 */
export function UnrepliedCommentList({
  comments,
  onMarkHandled,
  fallbackFocus,
}: {
  comments: Array<DashboardComment>;
  onMarkHandled: (id: number) => void;
  /** Takes focus when the focused row leaves the list. */
  fallbackFocus: () => HTMLElement | null;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const replyTrigger = useRef<HTMLButtonElement | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<PendingAction | null>(null);
  const replying = comments.find((comment) => comment.id === replyingId);
  const target = pending?.comment ?? replying;
  const targetPage = target ? commentTargetOf(target) : undefined;
  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(targetPage);
  const { muteUser, isMuting } = useMutedUsers(targetPage, {
    linkMutedList: true,
  });
  const {
    isPending: challengePending,
    reset: resetChallenge,
    turnstileProps,
  } = useTurnstile("comment");
  const compactChallenge = useMediaQuery("(max-width: 380px)");

  const closeReply = () => {
    setReplyingId(null);
    replyTrigger.current?.focus({ preventScroll: true });
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
      fallbackFocus()?.focus({ preventScroll: true });
      toast.success(m.admin_overview_reply_sent());
      void refreshUnrepliedComments(queryClient);
    } finally {
      resetChallenge();
    }
  };
  const markHandled = (comment: DashboardComment) => {
    if (replyingId === comment.id) setReplyingId(null);
    fallbackFocus()?.focus({ preventScroll: true });
    onMarkHandled(comment.id);
  };
  const confirmPending = async () => {
    if (!pending) return;
    if (pending.kind === "delete") {
      await deleteComment({ id: pending.comment.id });
      if (replyingId === pending.comment.id) setReplyingId(null);
    } else {
      await muteUser({ userId: pending.userId });
    }
    setPending(null);
    await refreshUnrepliedComments(queryClient);
  };

  return (
    <>
      <ul className="dashboard-list">
        {comments.map((comment) => {
          const userName =
            comment.userName || m.admin_overview_activity_anonymous();
          const userId = comment.userId;
          const actions: Array<ActionMenuItem> = [
            {
              label: m.dashboard_comment_mark_handled(),
              icon: Check,
              onSelect: () => markHandled(comment),
            },
            {
              label: m.comments_item_reply(),
              icon: MessageSquareReply,
              onSelect: (trigger) => {
                replyTrigger.current = trigger;
                setReplyingId(comment.id);
              },
            },
            {
              label: m.comments_item_delete(),
              icon: Trash2,
              danger: true,
              separator: true,
              onSelect: () => setPending({ kind: "delete", comment }),
            },
          ];
          if (userId && userId !== session?.user.id && !comment.userMuted)
            actions.push({
              label: m.admin_overview_comment_mute(),
              icon: UserX,
              danger: true,
              onSelect: () => setPending({ kind: "mute", comment, userId }),
            });
          const row = (
            <>
              <DashboardIdentity kind="user" image={comment.userImage} />
              <div className="dashboard-row-copy">
                <div className="dashboard-comment-byline">
                  <strong>{userName}</strong>
                  <time className="dashboard-time">
                    <ClientOnly fallback="—">
                      {formatTimeAgo(comment.createdAt)}
                    </ClientOnly>
                  </time>
                </div>
                {comment.snippet && (
                  <p className="dashboard-comment-snippet">{comment.snippet}</p>
                )}
                <p className="dashboard-comment-source">
                  {comment.momentId !== null ? (
                    <Badge size="sm" tone="primary">
                      {m.dashboard_comment_source_moment()}
                    </Badge>
                  ) : null}
                  <span className="dashboard-comment-source-title">
                    {comment.postTitle ?? comment.momentTitle}
                  </span>
                  <ArrowRight size={14} aria-hidden="true" />
                </p>
              </div>
            </>
          );
          return (
            <li key={comment.id}>
              <div className="dashboard-comment-row">
                {comment.postSlug ? (
                  <Link
                    to="/post/$slug"
                    params={{ slug: comment.postSlug }}
                    search={{ comment: comment.id }}
                    className="dashboard-comment"
                  >
                    {row}
                  </Link>
                ) : (
                  <Link
                    to="/moments/$id"
                    params={{ id: String(comment.momentId) }}
                    search={{ comment: comment.id }}
                    className="dashboard-comment"
                  >
                    {row}
                  </Link>
                )}
                <div className="dashboard-comment-actions">
                  <ActionMenu
                    items={actions}
                    label={m.comments_more_actions()}
                    placement="bottom-end"
                  />
                </div>
              </div>
              <CommentReveal open={replyingId === comment.id}>
                <div className="dashboard-comment-reply">
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
                    label={m.comments_item_reply_to({ name: userName })}
                    challenge={
                      <Turnstile
                        {...turnstileProps}
                        size={compactChallenge ? "compact" : "normal"}
                      />
                    }
                  />
                </div>
              </CommentReveal>
            </li>
          );
        })}
      </ul>
      <CommentConfirmationModal
        isOpen={pending?.kind === "delete"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_delete_title()}
        message={m.comments_delete_desc()}
        confirmLabel={m.comments_delete_confirm()}
        isDanger={true}
        isLoading={isDeleting}
        fallbackFocus={fallbackFocus}
      />
      <CommentConfirmationModal
        isOpen={pending?.kind === "mute"}
        onClose={() => setPending(null)}
        onConfirm={confirmPending}
        title={m.comments_mute_title()}
        message={m.comments_mute_desc({
          name:
            pending?.comment.userName || m.admin_overview_activity_anonymous(),
        })}
        confirmLabel={m.comments_mute_confirm()}
        isLoading={isMuting}
        fallbackFocus={fallbackFocus}
      />
    </>
  );
}
