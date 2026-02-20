import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { FuwariCommentEditor } from "../editor/comment-editor";
import FuwariConfirmationModal from "./confirmation-modal";
import { FuwariCommentList } from "./comment-list";
import type { JSONContent } from "@tiptap/react";
import { rootCommentsByPostIdInfiniteQuery } from "@/features/comments/queries";
import { useComments } from "@/features/comments/hooks/use-comments";
import { authClient } from "@/lib/auth/auth.client";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { Skeleton } from "@/components/ui/skeleton";

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
    toast.error("请先完成人机验证");
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
      <h2 className="text-xl font-bold fuwari-text-90">{totalCount} 条评论</h2>

      {/* Main Editor */}
      {session ? (
        <FuwariCommentEditor
          onSubmit={handleCreateComment}
          isSubmitting={isCreating && !replyTarget}
        />
      ) : (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm fuwari-text-30">加入讨论</p>
          <Link to="/login">
            <button className="fuwari-btn-primary h-9 px-5 text-sm rounded-lg gap-2">
              <LogIn size={14} />
              登录
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
            {isFetchingNextPage ? "正在加载..." : "加载更多评论"}
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <FuwariConfirmationModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDelete}
        title="删除评论"
        message="您确定要删除这条评论吗？如果是您本人的评论，删除后将显示为「该评论已删除」。"
        confirmLabel="确认删除"
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
