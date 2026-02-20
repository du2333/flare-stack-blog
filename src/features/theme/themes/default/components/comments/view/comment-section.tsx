import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { CommentList } from "./comment-list";
import { CommentEditor } from "./comment-editor";
import { CommentSectionSkeleton } from "./comment-section-skeleton";
import type { JSONContent } from "@tiptap/react";
import { useComments } from "@/features/comments/hooks/use-comments";
import { rootCommentsByPostIdInfiniteQuery } from "@/features/comments/queries";
import { authClient } from "@/lib/auth/auth.client";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Turnstile, useTurnstile } from "@/components/common/turnstile";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/_public/post/$slug");

interface CommentSectionProps {
  postId: number;
  className?: string;
}

export const CommentSection = ({ postId, className }: CommentSectionProps) => {
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
    // Throw so CommentEditor's catch block fires and content is preserved
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

  /* New Enhancement: Handle Anchor Navigation for CSR */
  useEffect(() => {
    if (isLoading || !data) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAnchor = () => {
      const hash = window.location.hash;
      if (!hash || !hash.startsWith("#comment-")) return;

      const commentId = parseInt(hash.replace("#comment-", ""), 10);
      if (isNaN(commentId)) return;

      // Robust retry mechanism to find the element as it might be rendered after data load/expansion
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
          timeoutId = setTimeout(attemptScroll, 200);
        }
      };

      attemptScroll();
    };

    handleAnchor();
    window.addEventListener("hashchange", handleAnchor);
    return () => {
      window.removeEventListener("hashchange", handleAnchor);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, data]);

  if (isLoading || !data) {
    return <CommentSectionSkeleton className={className} />;
  }

  return (
    <section
      className={cn(
        "space-y-12 mt-24 pt-12 border-t border-border/20 animate-in fade-in duration-700",
        className,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-xl font-serif font-medium text-foreground">
            {totalCount} 条评论
          </p>
        </div>
      </header>

      {/* Main Editor */}
      {session ? (
        <div className="space-y-6">
          <CommentEditor
            onSubmit={handleCreateComment}
            isSubmitting={isCreating && !replyTarget}
          />
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs font-mono text-muted-foreground/60 tracking-wider">
            加入讨论
          </p>
          <Link to="/login">
            <Button
              variant="outline"
              className="h-10 px-6 text-[10px] uppercase tracking-[0.25em] font-bold border-border/40 bg-transparent hover:bg-foreground hover:text-background transition-all"
            >
              <LogIn size={12} className="mr-2.5 opacity-70" />
              登录
            </Button>
          </Link>
        </div>
      )}

      <div ref={turnstileRef}>
        <Turnstile {...turnstileProps} />
      </div>

      {/* Comments List */}
      <CommentList
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
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] font-bold border-border hover:bg-foreground hover:text-background transition-all"
          >
            {isFetchingNextPage ? "正在加载..." : "加载更多评论"}
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDelete}
        title="删除评论"
        message="您确定要删除这条评论吗？如果是您本人的评论，删除后将显示为「该评论已删除」。"
        confirmLabel="确认删除"
        isDanger={true}
        isLoading={isDeleting}
      />
    </section>
  );
};
