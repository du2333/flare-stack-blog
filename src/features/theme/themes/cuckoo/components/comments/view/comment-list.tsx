import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import type { RootCommentWithReplyCount } from "@/features/comments/comments.schema";
import { repliesByRootIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { CuckooCommentEditor } from "../editor/comment-editor";
import { CuckooCommentItem } from "./comment-item";

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

export const CuckooCommentList = ({
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
      <div className="cuckoo-card-base cuckoo-text-50 py-10 text-center text-sm">
        <p>{m.comments_empty_cuckoo()}</p>
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
      <CuckooCommentItem
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
                  ? "w-10 bg-(--cuckoo-primary)/50"
                  : "w-6 bg-black/10 dark:bg-white/10 group-hover:w-10 group-hover:bg-(--cuckoo-primary)/50"
              }`}
            />
            <span className="text-xs cuckoo-text-50 group-hover:text-(--cuckoo-primary) transition-colors">
              {isExpanded
                ? m.comments_list_collapse_replies()
                : m.comments_list_expand_replies({ count: root.replyCount })}
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
                    <CuckooCommentItem
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
                  className="text-xs cuckoo-text-50 hover:text-(--cuckoo-primary) transition-colors font-medium py-2 disabled:opacity-50"
                >
                  {isFetchingNextPage
                    ? m.comments_loading()
                    : m.comments_list_load_more_replies()}
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
        <span className="text-xs cuckoo-text-50">
          {m.comments_item_reply()}
        </span>
        <span className="text-sm font-medium text-(--cuckoo-primary)">
          @{userName}
        </span>
      </div>
      <CuckooCommentEditor
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        autoFocus
        onCancel={onCancel}
        submitLabel={m.comments_editor_submit_reply()}
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
    <div className="flex items-center gap-4 py-3 px-4 rounded-(--cuckoo-radius) bg-(--cuckoo-input-bg)">
      <span className="text-sm cuckoo-text-50 flex-1">
        {m.comments_list_login_to_reply({ userName: userName })}
      </span>
      <Link to="/login">
        <button className="cuckoo-btn-primary h-8 px-4 text-sm rounded-lg">
          {m.comments_login()}
        </button>
      </Link>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm cuckoo-text-50 hover:cuckoo-text-75 transition-colors"
        >
          {m.comments_editor_cancel()}
        </button>
      )}
    </div>
  );
}
