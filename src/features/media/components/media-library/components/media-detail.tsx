import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Images,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { IconButton } from "@/components/ui/icon-button";
import { SectionHeading } from "@/components/ui/page-heading";
import { MOTION, useContentMotion, useReducedMotion } from "@/hooks/use-motion";
import { toast } from "sonner";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { linkedMomentsQuery, linkedPostsQuery } from "@/features/media/queries";
import { mediaUsageOf } from "@/features/media/utils/media.utils";
import { formatBytes, formatDate } from "@/lib/utils";
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
  onStep,
  hasPrevious = false,
  hasNext = false,
}: {
  asset: MediaAsset;
  open: boolean;
  onClose: () => void;
  /** Go to the image before (-1) or after (1) this one in the wall. */
  onStep?: (delta: -1 | 1) => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onReplace: (key: string, file: File) => Promise<void>;
  onDelete: (asset: MediaAsset) => void;
  isReplacing: boolean;
  preventClose?: boolean;
}) {
  const reduced = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  useContentMotion(contentRef, asset.key);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [asset.key]);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = isReplacing;
  const usage = mediaUsageOf(asset);
  // Posts are listed unless only Moments use the image.
  const showPosts =
    usage !== "current" ||
    asset.postCount > 0 ||
    asset.revisionOnlyPostCount > 0;
  const {
    data: linkedPosts = [],
    isPending,
    isError,
    refetch,
  } = useQuery(linkedPostsQuery(asset.key));

  // The arrows move through the wall while the image is up.
  const stepRef = useRef(onStep);
  stepRef.current = onStep;
  useEffect(() => {
    if (!open || preventClose || busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowLeft" && hasPrevious) stepRef.current?.(-1);
      else if (event.key === "ArrowRight" && hasNext) stepRef.current?.(1);
      else return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, preventClose, busy, hasPrevious, hasNext]);

  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      busy={preventClose || busy}
      className="media-lightbox admin-workspace"
      label={m.media_preview_title()}
    >
      <div className="media-lightbox-stage">
        <img
          key={asset.key}
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
        {onStep ? (
          <>
            <IconButton
              className="media-lightbox-step"
              data-side="previous"
              size="md"
              label={m.media_preview_previous()}
              disabled={!hasPrevious || busy}
              onClick={() => onStep(-1)}
            >
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton
              className="media-lightbox-step"
              data-side="next"
              size="md"
              label={m.media_preview_next()}
              disabled={!hasNext || busy}
              onClick={() => onStep(1)}
            >
              <ChevronRight size={20} />
            </IconButton>
          </>
        ) : null}
      </div>
      <div className="media-inspector custom-scrollbar" ref={contentRef}>
        <SectionHeading
          className="media-inspector-header"
          size="sm"
          title={m.media_preview_title()}
          actions={
            <IconButton
              variant="quiet"
              label={m.common_close()}
              size="sm"
              disabled={preventClose || busy}
              onClick={onClose}
            >
              <X size={17} />
            </IconButton>
          }
        />
        <h3 className="media-inspector-name">{asset.fileName}</h3>
        <dl className="media-inspector-facts">
          {asset.width && asset.height ? (
            <div>
              <dt>{m.media_col_dimensions()}</dt>
              <dd>
                {asset.width} × {asset.height}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>{m.media_preview_size()}</dt>
            <dd>{formatBytes(asset.sizeInBytes)}</dd>
          </div>
          <div>
            <dt>{m.media_col_uploaded()}</dt>
            <dd>{formatDate(asset.createdAt)}</dd>
          </div>
        </dl>
        <div className="media-inspector-actions">
          <Button
            variant="ink"
            size="sm"
            icon={<Copy size={15} />}
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
            variant="outline"
            size="sm"
            icon={<Upload size={15} />}
            loading={isReplacing}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {isReplacing ? m.common_processing() : m.media_replace()}
          </Button>
          {usage === "none" ? (
            <IconButton
              className="media-inspector-delete"
              variant="quiet"
              size="sm"
              tone="danger"
              label={m.media_delete()}
              disabled={busy}
              onClick={() => onDelete(asset)}
            >
              <Trash2 size={16} />
            </IconButton>
          ) : null}
        </div>
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
    </FuwariModal>
  );
}
