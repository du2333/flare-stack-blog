import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CommentItem } from "./comment-item";
import { CommentReplyForm } from "./comment-reply-form";
import type { RootCommentWithReplyCount } from "@/features/comments/comments.schema";
import type { JSONContent } from "@tiptap/react";
import { repliesByRootIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { Button } from "@/components/ui/button";

// Alias for local use
type RootCommentWithUser = RootCommentWithReplyCount;

interface CommentListProps {
  rootComments: Array<RootCommentWithUser>;
  postId: number;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  replyTarget?: { rootId: number; commentId: number; userName: string } | null;
  onCancelReply?: () => void;
  onSubmitReply?: (content: JSONContent) => Promise<void>;
  isSubmittingReply?: boolean;
  initialExpandedRootId?: number;
  highlightCommentId?: number;
}

export const CommentList = ({
  rootComments,
  postId,
  onReply,
  onDelete,
  replyTarget,
  onCancelReply,
  onSubmitReply,
  isSubmittingReply,
  initialExpandedRootId,
  highlightCommentId,
}: CommentListProps) => {
  const { data: session } = authClient.useSession();
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (initialExpandedRootId) {
      setExpandedRoots((prev) => new Set(prev).add(initialExpandedRootId));
    }
  }, [initialExpandedRootId]);

  const toggleExpand = (targetRootId: number) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(targetRootId)) {
        next.delete(targetRootId);
      } else {
        next.add(targetRootId);
      }
      return next;
    });
  };

  if (rootComments.length === 0) {
    return (
      <div className="py-20 text-center border-y border-border/30">
        <p className="text-[11px] uppercase tracking-[0.3em] font-mono text-muted-foreground">
          暂无评论，成为第一个评论的人吧
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {rootComments.map((root) => (
        <RootCommentWithReplies
          key={root.id}
          root={root}
          postId={postId}
          isExpanded={expandedRoots.has(root.id)}
          onToggleExpand={() => toggleExpand(root.id)}
          onReply={onReply}
          onDelete={onDelete}
          replyTarget={replyTarget}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
          isSubmittingReply={isSubmittingReply}
          session={session}
          highlightCommentId={highlightCommentId}
        />
      ))}
    </div>
  );
};

interface RootCommentWithRepliesProps {
  root: RootCommentWithUser;
  postId: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  replyTarget?: { rootId: number; commentId: number; userName: string } | null;
  onCancelReply?: () => void;
  onSubmitReply?: (content: JSONContent) => Promise<void>;
  isSubmittingReply?: boolean;
  session: AuthContext["session"] | null;
  highlightCommentId?: number;
}

function RootCommentWithReplies({
  root,
  postId,
  isExpanded,
  onToggleExpand,
  onReply,
  onDelete,
  replyTarget,
  onCancelReply,
  onSubmitReply,
  isSubmittingReply,
  session,
  highlightCommentId,
}: RootCommentWithRepliesProps) {
  const {
    data: repliesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    repliesByRootIdInfiniteQuery(postId, root.id, session?.user.id),
  );

  const allReplies = repliesData?.pages.flatMap((page) => page.items) ?? [];
  const isReplyingToRoot =
    replyTarget &&
    replyTarget.rootId === root.id &&
    replyTarget.commentId === root.id;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CommentItem
        comment={root}
        onReply={() => {
          if (onReply) {
            onReply(root.id, root.id, root.user?.name || "未知用户");
          }
        }}
        onDelete={onDelete}
        highlightCommentId={highlightCommentId}
        className={root.replyCount > 0 ? "pb-2 border-b-0" : ""}
      />

      {isReplyingToRoot && (
        <div className="py-6 ml-12 px-0 animate-in fade-in slide-in-from-top-2 duration-300">
          {session ? (
            onSubmitReply && onCancelReply ? (
              <CommentReplyForm
                parentUserName={replyTarget.userName}
                onSubmit={onSubmitReply}
                isSubmitting={isSubmittingReply ?? false}
                onCancel={onCancelReply}
                className="mt-0"
              />
            ) : null
          ) : (
            <div className="flex items-center gap-4 py-4 bg-muted/5 rounded-sm px-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-1">
                登录以回复 @{replyTarget.userName}
              </span>
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[9px] uppercase tracking-widest font-bold border-border/40 hover:bg-foreground hover:text-background transition-all"
                >
                  登录
                </Button>
              </Link>
              <button
                onClick={onCancelReply}
                className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

      {root.replyCount > 0 && (
        <div className="ml-12 mt-2">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-3 group mt-1 mb-1"
          >
            <div
              className={`h-px bg-border/40 transition-all duration-300 ${isExpanded ? "w-12 bg-foreground/40" : "w-8 group-hover:w-12 group-hover:bg-foreground/40"}`}
            />
            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest group-hover:text-foreground transition-colors">
              {isExpanded ? "收起回复" : `展开 ${root.replyCount} 条回复`}
            </span>
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-2 pl-6">
              {allReplies.map((reply) => {
                const isReplyingToThis =
                  replyTarget &&
                  replyTarget.rootId === root.id &&
                  replyTarget.commentId === reply.id;
                return (
                  <div key={reply.id}>
                    <CommentItem
                      comment={reply}
                      onReply={() => {
                        if (onReply) {
                          onReply(
                            root.id,
                            reply.id,
                            reply.replyTo?.name ||
                              reply.user?.name ||
                              "未知用户",
                          );
                        }
                      }}
                      onDelete={onDelete}
                      isReply
                      replyToName={reply.replyTo?.name}
                      highlightCommentId={highlightCommentId}
                    />
                    {isReplyingToThis && (
                      <div className="py-6 ml-0 px-0 animate-in fade-in slide-in-from-top-2 duration-300">
                        {session ? (
                          <CommentReplyForm
                            parentUserName={replyTarget.userName}
                            onSubmit={onSubmitReply!}
                            isSubmitting={isSubmittingReply!}
                            onCancel={onCancelReply!}
                            className="mt-0"
                          />
                        ) : (
                          <div className="flex items-center gap-4 py-4 bg-muted/5 rounded-sm px-4">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex-1">
                              登录以回复 @{replyTarget.userName}
                            </span>
                            <Link to="/login">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-[9px] uppercase tracking-widest font-bold border-border/40 hover:bg-foreground hover:text-background transition-all"
                              >
                                登录
                              </Button>
                            </Link>
                            <button
                              onClick={onCancelReply}
                              className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground/50 hover:text-foreground transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {hasNextPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="h-7 px-0 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground bg-transparent hover:bg-transparent mt-2"
                >
                  {isFetchingNextPage ? "加载中..." : "加载更多回复"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
