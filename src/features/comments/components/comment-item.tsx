import { ClientOnly } from "@tanstack/react-router";
import { memo } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import type { CommentWithUser } from "@/features/comments/comments.schema";
import { isMuted } from "@/features/muted-users/muted-users";
import { useSession } from "@/features/auth/hooks/use-session";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";
import { ExpandableContent } from "./expandable-content";
import { CommentAvatar } from "./comment-avatar";

interface CommentItemProps {
  comment: CommentWithUser;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  onMute?: (userId: string, userName: string) => void;
  onUnmute?: (userId: string, userName: string) => void;
  canReply?: boolean;
  isReply?: boolean;
  replyToName?: string | null;
  highlightCommentId?: number;
  className?: string;
}
export const CommentItem = memo(
  ({
    comment,
    onReply,
    onDelete,
    onMute,
    onUnmute,
    canReply = true,
    isReply,
    replyToName,
    highlightCommentId,
    className,
  }: CommentItemProps) => {
    const { data: session } = useSession();
    const deleted = comment.status === "deleted";
    const authorId = comment.user?.id;
    const authorName = comment.user?.name || m.comments_item_unknown_user();
    const isAdmin = session?.user.role === "admin";
    const authorMuted = isMuted(comment.user?.mutedAt);
    const actions: Array<ActionMenuItem> = [];
    if (
      !deleted &&
      (session?.user.id === comment.userId || isAdmin) &&
      onDelete
    )
      actions.push({
        label: m.comments_item_delete(),
        danger: true,
        onSelect: () => onDelete(comment.id),
      });
    if (
      isAdmin &&
      authorId &&
      comment.user?.role !== "admin" &&
      (authorMuted ? onUnmute : onMute)
    )
      actions.push({
        label: authorMuted ? m.comments_item_unmute() : m.comments_item_mute(),
        danger: !authorMuted,
        onSelect: () =>
          authorMuted
            ? onUnmute?.(authorId, authorName)
            : onMute?.(authorId, authorName),
      });
    return (
      <article
        id={`comment-${comment.id}`}
        className={cn(
          "comment-item",
          isReply && "comment-item-reply",
          highlightCommentId === comment.id && "comment-highlighted",
          className,
        )}
      >
        <CommentAvatar
          name={comment.user?.name}
          image={comment.user?.image}
          deleted={deleted}
        />
        <div className="comment-main">
          <header className="comment-meta">
            <div className="comment-author">
              <span>
                {deleted
                  ? m.comments_item_deleted_author()
                  : comment.user?.name || m.comments_item_anonymous()}
              </span>
              {comment.user?.role === "admin" && !deleted && (
                <Badge tone="primary" size="sm">
                  {m.comments_item_blogger()}
                </Badge>
              )}
              {isReply && replyToName && !deleted && (
                <span className="comment-reply-target">
                  {m.comments_item_reply_to({ name: replyToName })}
                </span>
              )}
            </div>
            <time dateTime={new Date(comment.createdAt).toISOString()}>
              <ClientOnly fallback="—">
                {formatDate(comment.createdAt, { includeTime: true })}
              </ClientOnly>
            </time>
          </header>
          {deleted ? (
            <p className="comment-deleted">
              {m.comments_item_deleted_content()}
            </p>
          ) : (
            <ExpandableContent content={comment.content} maxLines={6} />
          )}
          {!deleted && canReply && onReply && (
            <button
              type="button"
              className="comment-reply-button"
              onClick={() =>
                onReply(comment.rootId ?? comment.id, comment.id, authorName)
              }
            >
              {m.comments_item_reply()}
            </button>
          )}
        </div>
        {actions.length > 0 && (
          <div className="comment-management">
            <ActionMenu items={actions} label={m.comments_more_actions()} />
          </div>
        )}
      </article>
    );
  },
);
CommentItem.displayName = "CommentItem";
