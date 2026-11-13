import { CheckCheck, ImageOff, Images, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { AdminPage } from "@/components/admin/admin-page";
import { ACCEPTED_IMAGE_TYPES } from "@/features/media/media.schema";
import { formatBytes } from "@/lib/utils";
import {
  MOTION,
  useContentMotion,
  useMotionPresence,
} from "@/hooks/use-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { m } from "@/paraglide/messages";
import { MediaDetail, MediaToolbar } from "./components";
import { MediaCollection } from "./components/media-collection";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Spinner } from "@/components/ui/spinner";
import { useMediaLibrary, useMediaUpload } from "./hooks";
import { useMediaScroll } from "./hooks/use-media-scroll";
import { MediaCollectionSkeleton } from "./media-library-skeleton";
import { MediaInUseError } from "./media-usage";
import type { MediaAsset } from "./types";
import "./media-library.css";

export function MediaLibrary() {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLButtonElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedTrigger = useRef<HTMLButtonElement | null>(null);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "one"; asset: MediaAsset } | { kind: "unused" } | null
  >(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const {
    mediaItems,
    unusedOnly,
    setUnusedOnly,
    search,
    setSearch,
    sort,
    setSort,
    view,
    setView,
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
    isError,
    isFetchNextPageError,
    refetch,
    stats,
    deleteKeys,
    deleteUnused,
    isDeleting,
    replaceFile,
    isReplacing,
  } = useMediaLibrary();
  const { uploadFiles, isUploading, progress } = useMediaUpload();
  const active = preview
    ? (mediaItems.find((item) => item.key === preview.key) ?? preview)
    : null;

  const detailPresent = useMotionPresence(!!active, MOTION.modal);
  const retained = useRef<MediaAsset | null>(null);
  if (active) retained.current = active;
  const detailAsset = active ?? retained.current;
  const focusPending = useRef(false);
  useContentMotion(
    contentRef,
    `${view}:${unusedOnly}:${search}:${sort}:${isPending}:${mediaItems.map((item) => item.key).join(",")}`,
  );

  const captureAnchor = useMediaScroll(
    collectionRef,
    view,
    `${unusedOnly}:${search.trim()}:${sort}`,
  );

  useEffect(() => {
    setPreview(null);
  }, [unusedOnly, search, sort]);

  const activeIndex = active
    ? mediaItems.findIndex((item) => item.key === active.key)
    : -1;
  const step = (delta: -1 | 1) => {
    const next = mediaItems[activeIndex + delta];
    if (next) setPreview(next);
  };
  const openFilePicker = () => fileRef.current?.click();
  const closePreview = () => {
    captureAnchor(preview?.key);
    focusPending.current = true;
    setPreview(null);
  };
  useEffect(() => {
    if (detailPresent || !focusPending.current) return;
    focusPending.current = false;
    const fallback =
      collectionRef.current?.querySelector<HTMLButtonElement>("button");
    (selectedTrigger.current?.isConnected
      ? selectedTrigger.current
      : (fallback ?? uploadRef.current)
    )?.focus({ preventScroll: true });
  }, [detailPresent]);
  const handleFiles = (files: FileList | Array<File>) => {
    if (!isUploading) void uploadFiles(Array.from(files));
  };
  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    try {
      if (deleteTarget.kind === "one")
        await deleteKeys([deleteTarget.asset.key]);
      else await deleteUnused();
      setDeleteTarget(null);
      closePreview();
    } catch (error) {
      if (deleteTarget.kind === "unused") toast.error(m.media_delete_fail());
      // The toast says what uses the image now; confirming again would fail.
      else if (error instanceof MediaInUseError) setDeleteTarget(null);
    }
  };
  const toolbar = (
    <MediaToolbar
      unusedOnly={unusedOnly}
      onUnusedOnlyChange={(value) => {
        setPreview(null);
        setUnusedOnly(value);
      }}
      unusedCount={stats?.unusedCount}
      totalCount={stats?.totalCount}
      search={search}
      onSearchChange={setSearch}
      sort={sort}
      onSortChange={setSort}
      view={view}
      onViewChange={(next) => {
        captureAnchor(preview?.key);
        void setView(next);
      }}
    />
  );
  const searchTerm = search.trim();
  const isEmpty = !isPending && !isError && mediaItems.length === 0;

  return (
    <AdminPage
      className="media-workspace"
      title={m.media_title()}
      count={
        stats
          ? m.media_stats({
              count: stats.totalCount,
              size: formatBytes(stats.totalBytes),
            })
          : "—"
      }
      primaryAction={{
        label: m.media_upload(),
        icon: <Upload size={17} />,
        ref: uploadRef,
        disabled: isUploading,
        onClick: () => fileRef.current?.click(),
      }}
      toolbar={toolbar}
      body="list"
      scroll={false}
      inset={false}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length)
          handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="media-workspace-body">
        <div
          className="media-browser custom-scrollbar"
          data-scroll-restoration-id="admin-media-list"
          role="region"
          aria-label={m.media_title()}
          tabIndex={0}
          ref={collectionRef}
          aria-busy={isPending}
        >
          <div ref={contentRef} className="media-browser-content">
            {isPending ? (
              <MediaCollectionSkeleton view={view} />
            ) : isError && !mediaItems.length ? (
              <EmptyState
                variant="tile"
                role="alert"
                icon={ImageOff}
                description={m.media_load_fail()}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void refetch()}
                  >
                    {m.media_load_retry()}
                  </Button>
                }
              />
            ) : isEmpty && searchTerm ? (
              <EmptyState
                variant="tile"
                icon={Search}
                title={
                  unusedOnly
                    ? m.media_search_empty_unreferenced({ query: searchTerm })
                    : m.media_search_empty({ query: searchTerm })
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch("")}
                  >
                    {m.search_clear()}
                  </Button>
                }
              />
            ) : isEmpty ? (
              <EmptyState
                variant="tile"
                icon={unusedOnly ? CheckCheck : Images}
                title={
                  unusedOnly ? m.media_unreferenced_empty() : m.media_empty()
                }
                description={!unusedOnly ? m.media_empty_hint() : null}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={
                      unusedOnly ? () => setUnusedOnly(false) : openFilePicker
                    }
                  >
                    {unusedOnly ? m.media_filter_all() : m.media_choose()}
                  </Button>
                }
              />
            ) : (
              <>
                <MediaCollection
                  items={mediaItems}
                  view={view}
                  selectedKey={active?.key}
                  onSelect={(asset, trigger) => {
                    if (!active) captureAnchor(asset.key);
                    selectedTrigger.current = trigger;
                    setPreview(asset);
                  }}
                />
                <footer className="media-browser-footer">
                  {isError && !isFetchNextPageError ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void refetch()}
                    >
                      {m.media_load_retry()}
                    </Button>
                  ) : hasMore || isFetchNextPageError ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={isLoadingMore}
                      onClick={loadMore}
                    >
                      {isLoadingMore
                        ? m.media_grid_loading()
                        : isFetchNextPageError
                          ? m.media_load_retry()
                          : m.media_load_more()}
                    </Button>
                  ) : (
                    <span>{m.media_grid_end()}</span>
                  )}
                  {unusedOnly && !!stats?.unusedCount ? (
                    <Button
                      variant="text"
                      size="sm"
                      tone="danger"
                      className="media-cleanup"
                      onClick={() => setDeleteTarget({ kind: "unused" })}
                    >
                      {m.media_unused_cleanup()}
                    </Button>
                  ) : null}
                </footer>
              </>
            )}
          </div>
        </div>
      </div>
      {detailPresent && detailAsset ? (
        <MediaDetail
          open={!!active}
          asset={detailAsset}
          onClose={closePreview}
          onStep={step}
          hasPrevious={activeIndex > 0}
          hasNext={activeIndex >= 0 && activeIndex < mediaItems.length - 1}
          onReplace={async (key, file) => {
            const next = await replaceFile({ key, image: file });
            if (next)
              setPreview((previous) =>
                previous?.key === key ? { ...previous, ...next } : previous,
              );
          }}
          onDelete={(asset) => setDeleteTarget({ kind: "one", asset })}
          isReplacing={isReplacing}
          preventClose={deleteTarget !== null}
        />
      ) : null}
      {progress ? (
        <p role="status" className="media-upload-progress">
          <Spinner size={14} />
          {m.media_uploading({
            current: progress.current,
            total: progress.total,
          })}
        </p>
      ) : null}
      {dragging ? (
        <div className="media-drop-overlay">
          <span>
            <Upload size={22} aria-hidden="true" />
          </span>
          {m.media_drop()}
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title={m.media_delete_title()}
        message={
          deleteTarget?.kind === "one"
            ? m.media_delete_one({ name: deleteTarget.asset.fileName })
            : m.media_unused_confirm({ count: stats?.unusedCount ?? 0 })
        }
        confirmLabel={m.media_delete()}
        isDanger
        isLoading={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        fallbackFocus={() =>
          collectionRef.current?.querySelector<HTMLButtonElement>("button") ??
          uploadRef.current
        }
      />
    </AdminPage>
  );
}
