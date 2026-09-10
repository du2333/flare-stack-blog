import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink, FileText, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import {
  MOTION,
  useContentMotion,
  useMediaQuery,
  useReducedMotion,
} from "@/hooks/use-motion";
import { toast } from "sonner";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { linkedPostsQuery } from "@/features/media/queries";
import { getOptimizedImageUrl } from "@/features/media/utils/media.utils";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";

export function MediaDetail({
  asset,
  open,
  onClose,
  onReplace,
  onDelete,
  isReplacing,
  preventClose = false,
}: {
  asset: MediaAsset;
  open: boolean;
  onClose: () => void;
  onReplace: (key: string, file: File) => Promise<void>;
  onDelete: (asset: MediaAsset) => void;
  isReplacing: boolean;
  preventClose?: boolean;
}) {
  const reduced = useReducedMotion();
  const compact = useMediaQuery("(max-width: 1199px)");
  const contentRef = useRef<HTMLDivElement>(null);
  useContentMotion(contentRef, `${asset.key}:${compact}`);
  useEffect(() => {
    const inspector =
      contentRef.current?.closest<HTMLElement>(".media-inspector");
    if (inspector) inspector.scrollTop = 0;
  }, [asset.key]);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = isReplacing;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const {
    data: linkedPosts = [],
    isPending,
    isError,
    refetch,
  } = useQuery(linkedPostsQuery(asset.key));

  useEffect(() => {
    if (!open || compact || preventClose || busy) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open, compact, preventClose, busy]);

  const content = (
    <>
      <header className="media-inspector-header">
        <h2>{m.media_preview_title()}</h2>
        <button
          type="button"
          aria-label={m.common_close()}
          disabled={preventClose || busy}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <div ref={contentRef}>
        <div className="media-inspector-preview">
          <img
            src={getOptimizedImageUrl(asset.key)}
            alt={asset.fileName}
            onLoad={(event) => {
              if (open && !reduced)
                event.currentTarget.animate([{ opacity: 0 }, { opacity: 1 }], {
                  duration: MOTION.content,
                  easing: "ease-out",
                });
            }}
          />
        </div>
        <div className="media-inspector-name">
          <span>{asset.fileName}</span>
        </div>
        <p className="media-inspector-facts">
          {asset.width && asset.height
            ? `${asset.width} × ${asset.height} · `
            : ""}
          {formatBytes(asset.sizeInBytes)}
        </p>
        <section className="media-inspector-usage">
          <h3>
            {asset.postCount
              ? m.media_used_in({ count: asset.postCount })
              : m.media_unreferenced()}
          </h3>
          {isPending ? (
            <p>{m.media_grid_loading()}</p>
          ) : isError ? (
            <p>
              {m.media_reference_fail()}{" "}
              <button type="button" onClick={() => void refetch()}>
                {m.media_load_retry()}
              </button>
            </p>
          ) : (
            linkedPosts.map((post) => (
              <Link
                key={post.id}
                to="/admin/posts/edit/$id"
                params={{ id: String(post.id) }}
                className="media-reference"
              >
                <FileText size={16} />
                <span>{post.title}</span>
                {post.isCover ? <small>{m.media_badge_cover()}</small> : null}
                <ExternalLink size={14} />
              </Link>
            ))
          )}
        </section>
        <div className="media-inspector-actions">
          <button
            type="button"
            className="fuwari-btn-regular"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  new URL(asset.url, window.location.origin).href,
                );
                toast.success(m.media_copied());
              } catch {
                toast.error(m.media_copy_failed());
              }
            }}
          >
            <Copy size={16} />
            {m.media_copy_link()}
          </button>
          <button
            type="button"
            className="fuwari-btn-regular"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} />
            {isReplacing ? m.common_processing() : m.media_replace()}
          </button>
        </div>
        {asset.postCount === 0 ? (
          <button
            type="button"
            className="media-inspector-delete"
            disabled={busy}
            onClick={() => onDelete(asset)}
          >
            {m.media_delete()}
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
              toast.error(m.media_validation_file_invalid_type());
              return;
            }
            if (file.size > MAX_FILE_SIZE) {
              toast.error(m.media_validation_file_too_large());
              return;
            }
            void onReplace(asset.key, file).catch(() => {});
          }}
        />
      </div>
    </>
  );
  return compact ? (
    <FuwariModal
      open={open}
      onClose={onClose}
      busy={preventClose || busy}
      className="media-inspector media-inspector-dialog"
      label={m.media_preview_title()}
    >
      {content}
    </FuwariModal>
  ) : (
    <aside
      className="media-inspector"
      data-state={open ? "open" : "closing"}
      inert={!open}
      aria-label={m.media_preview_title()}
    >
      {content}
    </aside>
  );
}
