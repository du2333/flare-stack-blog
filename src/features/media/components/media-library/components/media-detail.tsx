import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink, FileText, Images, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { IconButton } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
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
import { linkedMomentsQuery, linkedPostsQuery } from "@/features/media/queries";
import { mediaUsageOf } from "@/features/media/utils/media.utils";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { MediaAsset } from "../types";

/** The Moments that show the image, linking to their pages. */
function MomentReferences({ asset }: { asset: MediaAsset }) {
  const {
    data: moments = [],
    isPending,
    isError,
    refetch,
  } = useQuery(linkedMomentsQuery(asset.key, asset.momentCount > 0));
  return (
    <section className="media-inspector-usage">
      <h3>{m.media_used_in_moments({ count: asset.momentCount })}</h3>
      {isPending ? (
        <p>{m.media_grid_loading()}</p>
      ) : isError ? (
        <p>
          {m.media_reference_fail()}{" "}
          <Button variant="text" size="sm" onClick={() => void refetch()}>
            {m.media_load_retry()}
          </Button>
        </p>
      ) : (
        moments.map((moment) => (
          <Link
            key={moment.id}
            to="/moments/$id"
            params={{ id: String(moment.id) }}
            className="media-reference"
          >
            <Images size={16} />
            <span className="media-reference-title">{moment.title}</span>
            <ExternalLink size={14} />
          </Link>
        ))
      )}
    </section>
  );
}

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
  const usage = mediaUsageOf(asset);
  // Posts are listed unless only Moments use the image.
  const showPosts =
    usage !== "current" ||
    asset.postCount > 0 ||
    asset.revisionOnlyPostCount > 0;
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
      <SectionHeading
        className="media-inspector-header"
        size="sm"
        title={m.media_preview_title()}
        actions={
          <IconButton
            label={m.common_close()}
            size="md"
            disabled={preventClose || busy}
            onClick={onClose}
          >
            <X size={19} />
          </IconButton>
        }
      />
      <div ref={contentRef}>
        <div className="media-inspector-preview">
          <img
            src={asset.url}
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
        {showPosts ? (
          <section className="media-inspector-usage">
            <h3>
              {asset.postCount > 0
                ? m.media_used_in({ count: asset.postCount })
                : asset.revisionOnlyPostCount > 0
                  ? m.media_badge_revisions()
                  : m.media_unreferenced()}
            </h3>
            {asset.postCount > 0 && asset.revisionOnlyPostCount > 0 ? (
              <p className="media-inspector-note">
                {m.media_revisions_also({ count: asset.revisionOnlyPostCount })}
              </p>
            ) : null}
            {isPending ? (
              <p>{m.media_grid_loading()}</p>
            ) : isError ? (
              <p>
                {m.media_reference_fail()}{" "}
                <Button variant="text" size="sm" onClick={() => void refetch()}>
                  {m.media_load_retry()}
                </Button>
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
                  <span className="media-reference-title">{post.title}</span>
                  <ExternalLink size={14} />
                  {post.isCover ||
                  (asset.postCount > 0 && post.revisionsOnly) ? (
                    <span className="media-reference-badges">
                      {post.isCover ? (
                        <Badge tone="primary" size="sm">
                          {m.media_badge_cover()}
                        </Badge>
                      ) : null}
                      {asset.postCount > 0 && post.revisionsOnly ? (
                        <Badge size="sm">{m.media_badge_revisions()}</Badge>
                      ) : null}
                    </span>
                  ) : null}
                </Link>
              ))
            )}
          </section>
        ) : null}
        {asset.momentCount > 0 ? <MomentReferences asset={asset} /> : null}
        <div className="media-inspector-actions">
          <Button
            icon={<Copy size={16} />}
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
            {m.media_copy_link()}
          </Button>
          <Button
            icon={<Upload size={16} />}
            loading={isReplacing}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {isReplacing ? m.common_processing() : m.media_replace()}
          </Button>
        </div>
        {usage === "none" ? (
          <Button
            variant="text"
            size="sm"
            tone="danger"
            className="media-inspector-delete"
            disabled={busy}
            onClick={() => onDelete(asset)}
          >
            {m.media_delete()}
          </Button>
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
      className="media-inspector media-inspector-dialog admin-workspace"
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
