import { memo, useMemo } from "react";
import { ExpandableContent } from "./expandable-content";
import type { CommentWithUser } from "@/features/comments/comments.schema";
import { authClient } from "@/lib/auth/auth.client";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CommentItemProps {
  comment: CommentWithUser;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  isReply?: boolean;
  replyToName?: string | null;
  highlightCommentId?: number;
  className?: string; // Added prop
}

export const CommentItem = memo(
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
          <p className="text-xs italic text-muted-foreground/40 py-1">
            该评论已被删除
          </p>
        );
      }
      return (
        <ExpandableContent
          content={comment.content}
          className="py-1 text-sm/relaxed text-foreground/90 font-light"
          maxLines={6}
        />
      );
    }, [comment.content, comment.status]);

    return (
      <div
        id={`comment-${comment.id}`}
        className={cn(
          "group flex gap-3 md:gap-5 py-6 md:py-8 scroll-mt-32 transition-colors duration-500",
          isReply
            ? "ml-3 pl-3 border-l border-border/10 md:ml-8 md:pl-8 md:border-l-0"
            : "border-b border-border/10",
          isHighlighted && "bg-muted/5 -mx-4 px-4 rounded-sm",
          className,
        )}
      >
        {/* Avatar - Minimalist Text or Image */}
        <div className="shrink-0 pt-1">
          <div className="w-8 h-8 rounded-full bg-muted/30 overflow-hidden flex items-center justify-center border border-border/20">
            {comment.status === "deleted" ? (
              <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-30">
                X
              </span>
            ) : comment.user?.image ? (
              <img
                src={comment.user.image}
                alt={comment.user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {comment.user?.name.slice(0, 1) || "?"}
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground tracking-wide">
                {comment.status === "deleted"
                  ? "已删除"
                  : comment.user?.name || "匿名用户"}
              </span>
              {isBlogger && comment.status !== "deleted" && (
                <span className="text-[9px] font-mono text-foreground/40 uppercase tracking-widest border border-border/30 px-1 rounded-[1px]">
                  博主
                </span>
              )}

              {isReply && replyToName && (
                <span className="text-[10px] text-muted-foreground/50 font-mono">
                  回复 @{comment.status === "deleted" ? "未知" : replyToName}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
              {formatDate(comment.createdAt, { includeTime: true })}
            </span>
          </div>

          {renderedContent}

          {comment.status !== "deleted" && (
            <div className="flex items-center gap-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const rootId = comment.rootId ?? comment.id;
                  onReply?.(rootId, comment.id, comment.user?.name || "用户");
                }}
                className="h-auto p-0 text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground bg-transparent hover:bg-transparent"
              >
                回复
              </Button>

              {(isAuthor || isAdmin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete?.(comment.id)}
                  className="h-auto p-0 text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-destructive bg-transparent hover:bg-transparent"
                >
                  删除
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

CommentItem.displayName = "CommentItem";
