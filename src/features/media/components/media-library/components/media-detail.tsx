import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { linkedPostsQuery } from "@/features/media/queries";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";

export function MediaDetail({
  asset,
  onClose,
  onRename,
  onReplace,
  onDelete,
  isReplacing,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onRename: (key: string, name: string) => Promise<void>;
  onReplace: (key: string, file: File) => Promise<void>;
  onDelete: (asset: MediaAsset) => void;
  isReplacing: boolean;
}) {
  const isMounted = !!asset;
  const shouldRender = useDelayUnmount(isMounted, 200);
  const [active, setActive] = useState<MediaAsset | null>(asset);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asset) {
      setActive(asset);
      setName(asset.fileName);
      setEditing(false);
    }
  }, [asset]);

  const { data: linkedPosts = [] } = useQuery(
    linkedPostsQuery(active?.key || ""),
  );

  if (!shouldRender || !active) return null;

  const unused = active.postCount === 0;
  const facts = [
    formatBytes(active.sizeInBytes),
    active.width && active.height ? `${active.width}×${active.height}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-3 md:p-6 ${
        isMounted ? "pointer-events-auto" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[1400px] h-[calc(100dvh-1.5rem)] md:h-[calc(100dvh-3rem)] fuwari-card-base grid grid-rows-[minmax(0,1fr)_minmax(12rem,auto)] md:grid-rows-none md:grid-cols-[minmax(0,1fr)_22rem] overflow-hidden fuwari-onload-animation"
      >
        <div className="bg-(--fuwari-btn-regular-bg) p-4 md:p-8 flex items-center justify-center min-h-0">
          <img
            src={getOptimizedImageUrl(active.key)}
            alt={active.fileName}
            className="max-h-full max-w-full object-contain rounded-xl"
          />
        </div>
        <div className="p-5 md:p-6 flex flex-col min-h-0 overflow-y-auto">
          {editing ? (
            <form
              className="flex gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!name.trim()) return;
                await onRename(active.key, name.trim());
                setActive({ ...active, fileName: name.trim() });
                setEditing(false);
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 h-10 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) px-3 text-sm fuwari-text-90 outline-none focus:border-(--fuwari-primary)"
                autoFocus
              />
              <button
                type="submit"
                className="fuwari-btn-primary rounded-xl h-10 px-3 text-sm"
              >
                {m.common_confirm()}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-left text-lg font-medium fuwari-text-90 break-all"
            >
              {active.fileName}
            </button>
          )}

          <p className="mt-1 text-sm fuwari-text-50">{facts}</p>
          <p className="mt-4 text-sm fuwari-text-50">
            {unused
              ? m.media_badge_unused()
              : m.media_used_in({
                  count: linkedPosts.length || active.postCount,
                })}
          </p>

          {linkedPosts.length > 0 ? (
            <div className="mt-3 space-y-2">
              {linkedPosts.map((post) => (
                <Link
                  key={post.id}
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                  className="flex items-center gap-2 rounded-xl bg-(--fuwari-btn-regular-bg) px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate">{post.title}</span>
                  {post.isCover ? (
                    <span className="ml-auto shrink-0 text-xs text-(--fuwari-btn-content)">
                      {m.media_badge_cover()}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-auto pt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const absolute = active.url.startsWith("http")
                    ? active.url
                    : `${window.location.origin}${active.url}`;
                  await navigator.clipboard.writeText(absolute);
                  toast.success(m.media_copied());
                } catch {
                  toast.error(m.media_copy_failed());
                }
              }}
              className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium"
            >
              {m.media_copy_link()}
            </button>
            <button
              type="button"
              disabled={isReplacing}
              onClick={() => fileRef.current?.click()}
              className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium"
            >
              {m.media_replace()}
            </button>
            {unused ? (
              <button
                type="button"
                onClick={() => onDelete(active)}
                className="h-10 px-4 text-sm font-medium text-(--fuwari-danger-fg)"
              >
                {m.media_delete()}
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onReplace(active.key, file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
