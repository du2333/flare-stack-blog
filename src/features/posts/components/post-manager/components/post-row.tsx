import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { Pin, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { PostListItem } from "../types";

interface PostRowProps {
  post: PostListItem;
  onDelete: (post: PostListItem) => void;
}

export function PostRow({ post, onDelete }: PostRowProps) {
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate({
      to: "/admin/posts/edit/$id",
      params: { id: String(post.id) },
    });
  };

  const isPublished = post.status === "published";

  return (
    <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 border-b border-(--fuwari-input-border) last:border-0">
      <button
        type="button"
        onClick={handleEdit}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {post.pinnedAt ? (
            <span className="inline-flex items-center gap-1 text-xs text-(--fuwari-primary)">
              <Pin size={12} strokeWidth={1.5} />
              {m.admin_posts_pinned()}
            </span>
          ) : null}
          <span
            className={
              isPublished
                ? "text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "text-xs px-2 py-0.5 rounded-full bg-(--fuwari-btn-regular-bg) fuwari-text-50"
            }
          >
            {isPublished
              ? m.admin_posts_status_published()
              : m.admin_posts_status_draft()}
          </span>
        </div>
        <h3 className="mt-1 font-medium text-base fuwari-text-90 truncate">
          {post.title.trim() || m.common_untitled()}
        </h3>
        <p className="text-sm fuwari-text-50 truncate">
          {post.summary || m.admin_posts_no_summary()}
        </p>
        <p className="mt-1 text-xs fuwari-text-30">
          {isPublished
            ? m.admin_posts_time_published()
            : m.admin_posts_time_modified()}{" "}
          <ClientOnly fallback="-">
            {isPublished
              ? formatDate(post.publishedAt || post.createdAt)
              : formatDate(post.updatedAt)}
          </ClientOnly>
        </p>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEdit}
          className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm"
        >
          {m.admin_posts_action_edit()}
        </button>
        <button
          type="button"
          onClick={() => onDelete(post)}
          className="rounded-xl h-9 px-3 text-sm fuwari-text-50 hover:text-destructive"
          title={m.admin_posts_action_delete()}
        >
          <Trash2 size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
