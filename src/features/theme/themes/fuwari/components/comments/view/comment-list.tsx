import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { remainingPublishedReplies } from "@/features/comments/comment-thread";
import type { RootCommentWithReplyCount } from "@/features/comments/comments.schema";
import { repliesByRootIdInfiniteQuery } from "@/features/comments/queries";
import { orpc } from "@/lib/orpc";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { FuwariCommentEditor } from "../editor/comment-editor";
import { FuwariCommentItem } from "./comment-item";

type RootCommentWithUser = RootCommentWithReplyCount;

interface CommentListProps {
  rootComments: Array<RootCommentWithUser>;
  postId: number;
  onReply?: (rootId: number, commentId: number, userName: string) => void;
  onDelete?: (commentId: number) => void;
  replyTarget?: { rootId: number; commentId: number; userName: string } | null;
  onCancelReply?: () => void;
  onSubmitReply?: (content: string) => Promise<void>;
  isSubmittingReply?: boolean;
  revealRootId?: number;
  revealCommentId?: number;
  challenge?: ReactNode;
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
  revealRootId,
  revealCommentId,
  challenge,
}: CommentListProps) => {
  const { data: session } = authClient.useSession();
  const [expandedRoots, setExpandedRoots] = useState<Set<number>>(() => {
    if (revealRootId && revealCommentId && revealRootId !== revealCommentId) {
      return new Set([revealRootId]);
    }
    return new Set();
  });

  useEffect(() => {
    if (revealRootId && revealCommentId && revealRootId !== revealCommentId) {
      setExpandedRoots((prev) => new Set(prev).add(revealRootId));
    }
  }, [revealRootId, revealCommentId]);

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
        <p className="text-sm fuwari-text-30">{m.comments_list_empty()}</p>
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
          revealCommentId={
            revealRootId === root.id ? revealCommentId : undefined
          }
          challenge={challenge}
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
  onSubmitReply?: (content: string) => Promise<void>;
  isSubmittingReply?: boolean;
  session: ReturnType<typeof authClient.useSession>["data"];
  revealCommentId?: number;
  challenge?: ReactNode;
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
  revealCommentId,
  challenge,
}: RootCommentWithRepliesProps) {
  const queryClient = useQueryClient();
  const {
    data: repliesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...repliesByRootIdInfiniteQuery(postId, root.id),
    enabled: isExpanded,
  });

  const fetchedReplies = repliesData?.pages.flatMap((page) => page.items) ?? [];
  const displayedReplies =
    isExpanded && fetchedReplies.length > 0 ? fetchedReplies : root.replies;
  const remaining = remainingPublishedReplies(
    root.replyCount,
    displayedReplies,
  );
  const showThread = displayedReplies.length > 0 || remaining > 0;
  const isReplyingToRoot =
    replyTarget &&
    replyTarget.rootId === root.id &&
    replyTarget.commentId === root.id;

  useEffect(() => {
    if (!isExpanded) {
      queryClient.removeQueries({
        queryKey: orpc.comments.replies.key({
          input: { postId, rootId: root.id },
        }),
      });
    }
  }, [isExpanded, postId, queryClient, root.id]);

  useEffect(() => {
    if (!isExpanded || revealCommentId == null || revealCommentId === root.id) {
      return;
    }
    if (displayedReplies.some((reply) => reply.id === revealCommentId)) {
      return;
    }
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [
    displayedReplies,
    fetchNextPage,
    hasNextPage,
    isExpanded,
    isFetchingNextPage,
    revealCommentId,
    root.id,
  ]);

  return (
    <div>
      <FuwariCommentItem
        comment={root}
        onReply={() => {
          if (onReply) {
            onReply(
              root.id,
              root.id,
              root.user?.name || m.comments_item_unknown_user(),
            );
          }
        }}
        onDelete={onDelete}
        highlightCommentId={revealCommentId}
        className={showThread ? "pb-2 border-b-0" : ""}
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
                challenge={challenge}
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

      {showThread && (
        <div className="ml-12 mt-1">
          <div className="mt-2 space-y-0 pl-4">
            {displayedReplies.map((reply) => {
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
                            m.comments_item_unknown_user(),
                        );
                      }
                    }}
                    onDelete={onDelete}
                    isReply
                    replyToName={reply.replyTo?.name}
                    highlightCommentId={revealCommentId}
                  />
                  {isReplyingToThis && (
                    <div className="py-4 ml-0 animate-in fade-in slide-in-from-top-2 duration-300">
                      {session ? (
                        <ReplyForm
                          userName={replyTarget.userName}
                          onSubmit={onSubmitReply!}
                          isSubmitting={isSubmittingReply!}
                          onCancel={onCancelReply!}
                          challenge={challenge}
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

            {isExpanded && remaining > 0 && hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="text-xs fuwari-text-50 hover:text-(--fuwari-primary) transition-colors font-medium py-2 disabled:opacity-50"
              >
                {isFetchingNextPage
                  ? m.comments_loading()
                  : m.comments_list_load_more_replies()}
              </button>
            )}
          </div>

          {isExpanded || remaining > 0 ? (
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
                {isExpanded
                  ? m.comments_list_collapse_replies()
                  : m.comments_list_expand_replies({ count: remaining })}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReplyForm({
  userName,
  onSubmit,
  isSubmitting,
  onCancel,
  challenge,
}: {
  userName: string;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
  challenge?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs fuwari-text-50">
          {m.comments_item_reply()}
        </span>
        <span className="text-sm font-medium text-(--fuwari-primary)">
          @{userName}
        </span>
      </div>
      <FuwariCommentEditor
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        autoFocus
        onCancel={onCancel}
        submitLabel={m.comments_editor_submit_reply()}
        challenge={challenge}
      />
    </div>
  );
}

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
        {m.comments_list_login_to_reply({ userName: userName })}
      </span>
      <Link to="/login">
        <button className="fuwari-btn-primary h-8 px-4 text-sm rounded-lg">
          {m.comments_login()}
        </button>
      </Link>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm fuwari-text-50 hover:fuwari-text-75 transition-colors"
        >
          {m.comments_editor_cancel()}
        </button>
      )}
    </div>
  );
}
