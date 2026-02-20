import { memo, useMemo } from "react";
import { ExpandableContent } from "./expandable-content";
import type { CommentWithUser } from "@/features/comments/comments.schema";
import { authClient } from "@/lib/auth/auth.client";
import { cn, formatDate } from "@/lib/utils";

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
          <p className="text-sm italic fuwari-text-30 py-1">该评论已被删除</p>
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
          "group flex gap-3 md:gap-4 py-5 md:py-6 scroll-mt-32 transition-colors duration-500",
          isReply
            ? "ml-3 pl-3 border-l-2 border-black/5 dark:border-white/5 md:ml-8 md:pl-6"
            : "border-b border-black/5 dark:border-white/5",
          isHighlighted &&
            "bg-(--fuwari-btn-plain-bg-hover) -mx-4 px-4 rounded-xl",
          className,
        )}
      >
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex items-center justify-center transition">
            {comment.status === "deleted" ? (
              <span className="text-xs fuwari-text-30">✕</span>
            ) : comment.user?.image ? (
              <img
                src={comment.user.image}
                alt={comment.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium fuwari-text-50">
                {comment.user?.name.slice(0, 1) || "?"}
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium fuwari-text-75">
                {comment.status === "deleted"
                  ? "已删除"
                  : comment.user?.name || "匿名用户"}
              </span>
              {isBlogger && comment.status !== "deleted" && (
                <span className="text-[10px] font-medium text-(--fuwari-primary) border border-(--fuwari-primary)/30 px-1.5 py-0.5 rounded-md leading-none">
                  博主
                </span>
              )}

              {isReply && replyToName && (
                <span className="text-xs fuwari-text-30">
                  回复{" "}
                  <span className="text-(--fuwari-primary)">
                    @{comment.status === "deleted" ? "未知" : replyToName}
                  </span>
                </span>
              )}
            </div>
            <span className="text-xs fuwari-text-30">
              {formatDate(comment.createdAt, { includeTime: true })}
            </span>
          </div>

          {renderedContent}

          {comment.status !== "deleted" && (
            <div className="flex items-center gap-4 pt-1">
              <button
                onClick={() => {
                  const rootId = comment.rootId ?? comment.id;
                  onReply?.(rootId, comment.id, comment.user?.name || "用户");
                }}
                className="text-xs fuwari-text-30 hover:text-(--fuwari-primary) transition-colors font-medium"
              >
                回复
              </button>

              {(isAuthor || isAdmin) && (
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="text-xs fuwari-text-30 hover:text-red-500 transition-colors font-medium"
                >
                  删除
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
