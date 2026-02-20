import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FuwariCommentEditor } from "../editor/comment-editor";
import { FuwariCommentItem } from "./comment-item";
import type { RootCommentWithReplyCount } from "@/features/comments/comments.schema";
import type { JSONContent } from "@tiptap/react";
import { repliesByRootIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";

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

export const FuwariCommentList = ({
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
      <div className="py-16 text-center">
        <p className="text-sm fuwari-text-30">暂无评论，成为第一个评论的人吧</p>
      </div>
    );
  }

  return (
    <div>
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
  session: ReturnType<typeof authClient.useSession>["data"];
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
    <div>
      <FuwariCommentItem
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
        <div className="py-4 ml-12 animate-in fade-in slide-in-from-top-2 duration-300">
          {session ? (
            onSubmitReply && onCancelReply ? (
              <ReplyForm
                userName={replyTarget.userName}
                onSubmit={onSubmitReply}
                isSubmitting={isSubmittingReply ?? false}
                onCancel={onCancelReply}
              />
            ) : null
          ) : (
            <LoginToReplyPrompt
              userName={replyTarget.userName}
              onCancel={onCancelReply}
            />
          )}
        </div>
      )}

      {root.replyCount > 0 && (
        <div className="ml-12 mt-1">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-3 group py-1"
          >
            <div
              className={`h-px transition-all duration-300 ${
                isExpanded
                  ? "w-10 bg-(--fuwari-primary)/50"
                  : "w-6 bg-black/10 dark:bg-white/10 group-hover:w-10 group-hover:bg-(--fuwari-primary)/50"
              }`}
            />
            <span className="text-xs fuwari-text-50 group-hover:text-(--fuwari-primary) transition-colors">
              {isExpanded ? "收起回复" : `展开 ${root.replyCount} 条回复`}
            </span>
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-0 pl-4">
              {allReplies.map((reply) => {
                const isReplyingToThis =
                  replyTarget &&
                  replyTarget.rootId === root.id &&
                  replyTarget.commentId === reply.id;
                return (
                  <div key={reply.id}>
                    <FuwariCommentItem
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
                      <div className="py-4 ml-0 animate-in fade-in slide-in-from-top-2 duration-300">
                        {session ? (
                          <ReplyForm
                            userName={replyTarget.userName}
                            onSubmit={onSubmitReply!}
                            isSubmitting={isSubmittingReply!}
                            onCancel={onCancelReply!}
                          />
                        ) : (
                          <LoginToReplyPrompt
                            userName={replyTarget.userName}
                            onCancel={onCancelReply}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {hasNextPage && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) transition-colors font-medium py-2 disabled:opacity-50"
                >
                  {isFetchingNextPage ? "加载中..." : "加载更多回复"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Inline Reply Form */
function ReplyForm({
  userName,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  userName: string;
  onSubmit: (content: JSONContent) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs fuwari-text-50">回复</span>
        <span className="text-sm font-medium text-(--fuwari-primary)">
          @{userName}
        </span>
      </div>
      <FuwariCommentEditor
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        autoFocus
        onCancel={onCancel}
        submitLabel="发表回复"
      />
    </div>
  );
}

/* Login Prompt for Reply */
function LoginToReplyPrompt({
  userName,
  onCancel,
}: {
  userName: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-(--fuwari-radius-large) bg-(--fuwari-input-bg)">
      <span className="text-sm fuwari-text-50 flex-1">
        登录以回复 <span className="text-(--fuwari-primary)">@{userName}</span>
      </span>
      <Link to="/login">
        <button className="fuwari-btn-primary h-8 px-4 text-sm rounded-lg">
          登录
        </button>
      </Link>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm fuwari-text-50 hover:fuwari-text-75 transition-colors"
        >
          取消
        </button>
      )}
    </div>
  );
}
