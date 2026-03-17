import { useInfiniteQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { JSONContent } from "@tiptap/react";
import { LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/features/comments/hooks/use-comments";
import { rootCommentsByPostIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { m } from "@/paraglide/messages";
import { FuwariCommentEditor } from "../editor/comment-editor";
import { FuwariCommentList } from "./comment-list";
import FuwariConfirmationModal from "./confirmation-modal";

const routeApi = getRouteApi("/_public/post/$slug");

interface FuwariCommentSectionProps {
  postId: number;
}

export function FuwariCommentSection({ postId }: FuwariCommentSectionProps) {
  const { data: session } = authClient.useSession();
  const { rootId, highlightCommentId } = routeApi.useSearch();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery(
      rootCommentsByPostIdInfiniteQuery(postId, session?.user.id),
    );

  const rootComments = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.total ?? 0;

  const { createComment, deleteComment, isCreating, isDeleting } =
    useComments(postId);

  const [replyTarget, setReplyTarget] = useState<{
    rootId: number;
    commentId: number;
    userName: string;
  } | null>(null);

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const {
    isPending: turnstilePending,
    reset: resetTurnstile,
    turnstileProps,
  } = useTurnstile("comment");

  const requireTurnstile = () => {
    if (!turnstilePending) return false;
    toast.error(m.comments_turnstile_required());
    turnstileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    throw new Error("TURNSTILE_PENDING");
  };

  const handleCreateComment = async (content: JSONContent) => {
    requireTurnstile();
    try {
      await createComment({
        data: {
          postId,
          content,
        },
      });
    } finally {
      resetTurnstile();
    }
  };

  const handleCreateReply = async (content: JSONContent) => {
    if (!replyTarget) return;
    requireTurnstile();
    try {
      await createComment({
        data: {
          postId,
          content,
          rootId: replyTarget.rootId,
          replyToCommentId: replyTarget.commentId,
        },
      });
      setReplyTarget(null);
    } finally {
      resetTurnstile();
    }
  };

  const handleDelete = async () => {
    if (commentToDelete) {
      await deleteComment({ data: { id: commentToDelete } });
      setCommentToDelete(null);
    }
  };

  /* Anchor Navigation for CSR */
  useEffect(() => {
    if (isLoading || !data) return;

    const handleAnchor = () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith("#comment-")) return;

      const commentId = parseInt(hash.replace("#comment-", ""), 10);
      if (isNaN(commentId)) return;

      let retries = 0;
      const maxRetries = 20;

      const attemptScroll = () => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        if (retries < maxRetries) {
          retries++;
          setTimeout(attemptScroll, 200);
        }
      };

      attemptScroll();
    };

    handleAnchor();
    window.addEventListener("hashchange", handleAnchor);
    return () => window.removeEventListener("hashchange", handleAnchor);
  }, [isLoading, data]);

  if (isLoading || !data) {
    return <FuwariCommentSectionSkeleton />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold fuwari-text-90">
        {m.comments_count({ count: totalCount })}
      </h2>

      {/* Main Editor */}
      {session ? (
        <FuwariCommentEditor
          onSubmit={handleCreateComment}
          isSubmitting={isCreating && !replyTarget}
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

      <div ref={turnstileRef}>
        <Turnstile {...turnstileProps} />
      </div>

      {/* Comments List */}
      <FuwariCommentList
        rootComments={rootComments}
        postId={postId}
        onReply={(rootIdArg, commentId, userName) =>
          setReplyTarget({ rootId: rootIdArg, commentId, userName })
        }
        onDelete={(id) => setCommentToDelete(id)}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onSubmitReply={handleCreateReply}
        isSubmittingReply={isCreating}
        initialExpandedRootId={rootId}
        highlightCommentId={highlightCommentId}
      />

      {/* Load More Root Comments */}
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

      {/* Delete Confirmation Modal */}
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
