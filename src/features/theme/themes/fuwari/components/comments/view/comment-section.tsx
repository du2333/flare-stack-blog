import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/features/comments/hooks/use-comments";
import { useScrollToComment } from "@/features/comments/hooks/use-scroll-to-comment";
import {
  commentThreadQuery,
  rootCommentsByPostIdInfiniteQuery,
} from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { FuwariCommentEditor } from "../editor/comment-editor";
import { FuwariCommentList } from "./comment-list";
import FuwariConfirmationModal from "./confirmation-modal";

const routeApi = getRouteApi("/_public/post/$slug");
const LOCATE_TOAST = "locate-comment";
const LOCATE_DELAY_MS = 300;

interface FuwariCommentSectionProps {
  postId: number;
}

export function FuwariCommentSection({ postId }: FuwariCommentSectionProps) {
  const { data: session } = authClient.useSession();
  const { comment: commentId } = routeApi.useSearch();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(rootCommentsByPostIdInfiniteQuery(postId));
  const threadQuery = useQuery({
    ...commentThreadQuery(postId, commentId ?? 0),
    enabled: commentId != null,
  });

  const listed = data?.pages.flatMap((page) => page.items) ?? [];
  const thread = threadQuery.data;
  const rootComments =
    thread && !listed.some((root) => root.id === thread.id)
      ? [...listed, thread]
      : listed;
  const totalCount = data?.pages[0]?.total ?? 0;

  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(postId);

  const [replyTarget, setReplyTarget] = useState<{
    rootId: number;
    commentId: number;
    userName: string;
  } | null>(null);
  const [localReveal, setLocalReveal] = useState<{
    rootId: number;
    commentId: number;
  } | null>(null);
  const reveal =
    localReveal ??
    (thread && commentId != null ? { rootId: thread.id, commentId } : null);

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("comment");

  useScrollToComment(threadQuery.isSuccess ? commentId : undefined);

  useEffect(() => {
    if (commentId == null || threadQuery.isSuccess || threadQuery.isError) {
      return;
    }
    const timer = window.setTimeout(() => {
      toast.loading(m.comments_locating(), { id: LOCATE_TOAST });
    }, LOCATE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [commentId, threadQuery.isError, threadQuery.isSuccess]);

  useEffect(() => {
    if (threadQuery.isSuccess) {
      toast.dismiss(LOCATE_TOAST);
    }
  }, [threadQuery.isSuccess]);

  useEffect(() => {
    if (!threadQuery.isError) return;
    toast.dismiss(LOCATE_TOAST);
    toast.error(m.comments_locate_failed());
  }, [threadQuery.isError]);

  const requireTurnstile = () => {
    if (!turnstilePending) return false;
    toast.error(m.comments_turnstile_required());
    turnstileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    throw new Error("TURNSTILE_PENDING");
  };

  const handleCreateComment = async (content: string) => {
    requireTurnstile();
    try {
      await createComment({
        postId,
        content,
      });
    } finally {
      resetTurnstile();
    }
  };

  const handleCreateReply = async (content: string) => {
    if (!replyTarget) return;
    requireTurnstile();
    try {
      const created = await createComment({
        postId,
        content,
        rootId: replyTarget.rootId,
        replyToCommentId: replyTarget.commentId,
      });
      if (created?.id) {
        setLocalReveal({ rootId: replyTarget.rootId, commentId: created.id });
      }
      setReplyTarget(null);
    } finally {
      resetTurnstile();
    }
  };

  const handleDelete = async () => {
    if (commentToDelete) {
      await deleteComment({ id: commentToDelete });
      setCommentToDelete(null);
    }
  };

  if (isLoading || !data) {
    return <FuwariCommentSectionSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold fuwari-text-90">
        {m.comments_count({ count: totalCount })}
      </h2>

      {session ? (
        <FuwariCommentEditor
          onSubmit={handleCreateComment}
          isSubmitting={isCreating && !replyTarget}
          challenge={
            replyTarget ? undefined : (
              <div ref={turnstileRef}>
                <Turnstile {...turnstileProps} />
              </div>
            )
          }
        />
      ) : (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm fuwari-text-30">
            {m.comments_join_discussion()}
          </p>
          <Link to="/login">
            <button className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg gap-2">
              <LogIn size={14} />
              {m.comments_login()}
            </button>
          </Link>
        </div>
      )}

      <FuwariCommentList
        rootComments={rootComments}
        postId={postId}
        onReply={(rootIdArg, commentIdArg, userName) =>
          setReplyTarget({
            rootId: rootIdArg,
            commentId: commentIdArg,
            userName,
          })
        }
        onDelete={(id) => setCommentToDelete(id)}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onSubmitReply={handleCreateReply}
        isSubmittingReply={isCreating}
        revealRootId={reveal?.rootId}
        revealCommentId={reveal?.commentId}
        challenge={
          replyTarget && session ? (
            <div ref={turnstileRef}>
              <Turnstile {...turnstileProps} />
            </div>
          ) : undefined
        }
      />

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="fuwari-btn-regular h-10 px-6 text-sm rounded-lg disabled:opacity-50"
          >
            {isFetchingNextPage ? m.comments_loading() : m.comments_load_more()}
          </button>
        </div>
      )}

      <FuwariConfirmationModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDelete}
        title={m.comments_delete_title()}
        message={m.comments_delete_desc()}
        confirmLabel={m.comments_delete_confirm()}
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}

function FuwariCommentSectionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-24 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-(--fuwari-radius-large)" />
      <div className="space-y-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="py-6 flex gap-4 border-b border-black/5 dark:border-white/5"
          >
            <Skeleton className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-3/4 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
