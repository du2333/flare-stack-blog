import { ClientOnly, Link } from "@tanstack/react-router";
import { MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { PostListItem, SortField } from "../types";

interface PostRowProps {
  post: PostListItem;
  sortBy: SortField;
  onDelete: (post: PostListItem, trigger: HTMLButtonElement | null) => void;
}

export function PostRow({ post, sortBy, onDelete }: PostRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const title = post.title.trim() || m.common_untitled();
  const date = post[sortBy];
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [menuOpen]);
  return (
    <tr>
      <td>
        <div className="post-list-title-cell">
          <span className="post-list-pin">
            {post.pinnedAt && (
              <Pin size={18} aria-label={m.admin_posts_pinned()} />
            )}
          </span>
          <Link
            to="/admin/posts/edit/$id"
            params={{ id: String(post.id) }}
            className="post-list-title-link"
          >
            <strong>{title}</strong>
            <span>{post.slug || m.admin_posts_slug_empty()}</span>
          </Link>
        </div>
      </td>
      <td>
        <span className={`post-list-status ${post.status}`}>
          {post.status === "published"
            ? m.admin_posts_status_published()
            : m.admin_posts_status_draft()}
        </span>
      </td>
      <td className="post-list-date">
        <span className="post-list-mobile-date-label">
          {sortBy === "publishedAt"
            ? m.admin_posts_time_published()
            : m.admin_posts_time_modified()}{" "}
        </span>
        {date ? (
          <time dateTime={date.toISOString()}>
            <ClientOnly fallback="—">{formatDate(date)}</ClientOnly>
          </time>
        ) : (
          "—"
        )}
      </td>
      <td>
        <div className="post-list-row-actions">
          <Link
            to="/admin/posts/edit/$id"
            params={{ id: String(post.id) }}
            aria-label={m.admin_posts_edit_named({ title })}
          >
            {m.admin_posts_action_edit()}
          </Link>
          <div
            ref={menuRef}
            className="post-list-menu"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setMenuOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <button
              ref={triggerRef}
              type="button"
              aria-label={m.admin_posts_more_named({ title })}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div role="menu" aria-label={m.admin_posts_more_named({ title })}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(post, triggerRef.current);
                  }}
                >
                  <Trash2 size={15} />
                  {m.admin_posts_action_delete_post()}
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
