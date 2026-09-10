import { ClientOnly, Link } from "@tanstack/react-router";
import { MoreHorizontal, Pin, Trash2 } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { PostListItem, SortField } from "../types";

interface PostRowProps {
  post: PostListItem;
  sortBy: SortField;
  onDelete: (post: PostListItem, trigger: HTMLButtonElement | null) => void;
}

export function PostRow({ post, sortBy, onDelete }: PostRowProps) {
  const title = post.title.trim() || m.common_untitled();
  const date = post[sortBy];
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
          <PostRowMenu
            title={title}
            onDelete={(trigger) => onDelete(post, trigger)}
          />
        </div>
      </td>
    </tr>
  );
}

function PostRowMenu({
  title,
  onDelete,
}: {
  title: string;
  onDelete: (trigger: HTMLButtonElement | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const present = useMotionPresence(open, MOTION.popover);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!present) {
      setPosition(null);
      return;
    }
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const above = window.innerHeight - rect.bottom < 100;
    setPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      top: above ? undefined : rect.bottom + 4,
      bottom: above ? window.innerHeight - rect.top + 4 : undefined,
      transformOrigin: above ? "bottom right" : "top right",
    });
    const close = () => setOpen(false);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, present]);
  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open, position]);
  return (
    <div className="post-list-menu">
      <button
        ref={triggerRef}
        type="button"
        aria-label={m.admin_posts_more_named({ title })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} />
      </button>
      {present && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={m.admin_posts_more_named({ title })}
              className="post-row-menu fuwari-popover-motion"
              data-state={open ? "open" : "closing"}
              inert={!open}
              aria-hidden={!open}
              style={position}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  triggerRef.current?.focus({ preventScroll: true });
                }
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete(triggerRef.current);
                }}
              >
                <Trash2 size={15} />
                {m.admin_posts_action_delete_post()}
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
