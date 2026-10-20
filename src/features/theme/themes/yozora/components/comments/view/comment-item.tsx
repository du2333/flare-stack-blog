import { ClientOnly } from "@tanstack/react-router";
import { memo, useMemo } from "react";
import type { CommentWithUser } from "@/features/comments/comments.schema";
import { authClient } from "@/lib/auth/auth.client";
import { cn, formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { ExpandableContent } from "./expandable-content";

interface CommentItemProps {
  comment: CommentWithUser;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  isReply?: boolean;
  replyToName?: string | null;
  highlightCommentId?: number;
  className?: string;
}

export const FuwariCommentItem = memo(
  ({
    comment,
    onReply,
    onDelete,
    isReply,
    replyToName,
    highlightCommentId,
    className,
  }: CommentItemProps) => {
    const isHighlighted = highlightCommentId === comment.id;

    const { data: session } = authClient.useSession();

    const isAuthor = session?.user.id === comment.userId;
    const isAdmin = session?.user.role === "admin";
    const isBlogger = comment.user?.role === "admin";

    const renderedContent = useMemo(() => {
      if (comment.status === "deleted") {
        return (
          <p className="text-sm italic fuwari-text-30 py-1">
            {m.comments_item_deleted_content()}
          </p>
        );
      }
      return (
        <ExpandableContent
          content={comment.content}
          className="py-1"
          maxLines={6}
        />
      );
    }, [comment.content, comment.status]);

    return (
      <div
        id={`comment-${comment.id}`}
        className={cn(
          "yz-note-c group py-5 md:py-6 scroll-mt-32 transition-colors duration-500",
          isReply && "yz-note-c--reply",
          isHighlighted && "yz-note-c--hit",
          className,
        )}
      >
        {/* Avatar：方形小印 */}
        <div className="shrink-0 pt-0.5">
          <div className="w-8 h-8 rounded-[3px] bg-black/5 dark:bg-white/10 overflow-hidden flex items-center justify-center border border-(--yz-rule-soft) transition">
            {comment.status === "deleted" ? (
              <span className="text-xs fuwari-text-30">✕</span>
            ) : comment.user?.image ? (
              <img
                src={comment.user.image}
                alt={comment.user.name ?? m.comments_item_anonymous()}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium fuwari-text-50">
                {comment.user?.name?.slice(0, 1) || "?"}
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="yz-note-c__name">
                {comment.status === "deleted"
                  ? m.comments_item_deleted_author()
                  : comment.user?.name || m.comments_item_anonymous()}
              </span>
              {isBlogger && comment.status !== "deleted" && (
                <span className="text-[9px] font-mono tracking-widest uppercase text-(--yz-gold) border border-(--yz-gold)/40 px-1 py-px leading-none">
                  {m.comments_item_blogger()}
                </span>
              )}

              {isReply && replyToName && (
                <span className="text-xs fuwari-text-30">
                  {m.comments_item_reply_to({
                    name:
                      comment.status === "deleted"
                        ? m.comments_item_unknown()
                        : replyToName,
                  })}
                </span>
              )}
            </div>
            <span className="yz-note-c__date">
              <ClientOnly fallback="-">
                {formatDate(comment.createdAt, { includeTime: true })}
              </ClientOnly>
            </span>
          </div>

          {renderedContent}

          {comment.status !== "deleted" && (
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={() => {
                  const rootId = comment.rootId ?? comment.id;
                  onReply?.(
                    rootId,
                    comment.id,
                    comment.user?.name || m.comments_item_unknown_user(),
                  );
                }}
                className="yz-note-c__act"
              >
                {m.comments_item_reply()}
              </button>

              {(isAuthor || isAdmin) && (
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="yz-note-c__act yz-note-c__act--danger"
                >
                  {m.comments_item_delete()}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

FuwariCommentItem.displayName = "FuwariCommentItem";
