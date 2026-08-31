import { useEffect, useRef, useState } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { MediaDetail, MediaGrid, MediaToolbar } from "./components";
import { useMediaLibrary, useMediaUpload } from "./hooks";
import type { MediaAsset } from "./types";

export function MediaLibrary() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { setPrimaryAction } = useAdminChrome();
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
    loadMore,
    hasMore,
    isLoadingMore,
    isPending,
    stats,
    deleteKeys,
    deleteUnused,
    isDeleting,
    rename,
    replaceFile,
    isReplacing,
  } = useMediaLibrary();
  const { uploadFiles, isUploading, progress } = useMediaUpload();

  useEffect(() => {
    setPrimaryAction({
      label: m.media_upload(),
      onClick: () => fileRef.current?.click(),
      disabled: isUploading,
    });
    return () => setPrimaryAction(null);
  }, [isUploading, setPrimaryAction]);

  const openFilePicker = () => fileRef.current?.click();

  const handleFiles = (list: FileList | Array<File>) => {
    const files = Array.from(list).filter(
      (file) =>
        ACCEPTED_IMAGE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE,
    );
    if (files.length > 0) void uploadFiles(files);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "one") {
      await deleteKeys([deleteTarget.asset.key]);
      setPreview(null);
    } else {
      await deleteUnused();
    }
    setDeleteTarget(null);
  };

  const isEmpty = !isPending && mediaItems.length === 0;
  const isDefaultEmpty = isEmpty && !unusedOnly;

  return (
    <div
      className="space-y-4"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length > 0) {
          handleFiles(event.dataTransfer.files);
        }
      }}
    >
      <div
        className="hidden lg:flex justify-between items-center px-1 fuwari-onload-animation"
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 50ms)" }}
      >
        <h1 className="text-2xl font-medium fuwari-text-90">
          {m.media_title()}
        </h1>
        <button
          type="button"
          disabled={isUploading}
          onClick={openFilePicker}
          className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
        >
          {m.media_upload()}
        </button>
      </div>

      <div
        className="fuwari-card-base p-5 md:p-6 space-y-6 relative fuwari-onload-animation"
        style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
      >
        {dragging ? (
          <div className="absolute inset-0 z-10 rounded-[inherit] border-2 border-dashed border-(--fuwari-primary) bg-(--fuwari-page-bg)/80 grid place-items-center text-sm font-medium text-(--fuwari-primary)">
            {m.media_drop()}
          </div>
        ) : null}

        {!isDefaultEmpty ? (
          <MediaToolbar
            unusedOnly={unusedOnly}
            onUnusedOnlyChange={setUnusedOnly}
            unusedCount={stats?.unusedCount ?? 0}
            totalCount={stats?.totalCount ?? 0}
            totalBytes={stats?.totalBytes ?? 0}
            onDeleteUnused={() => setDeleteTarget({ kind: "unused" })}
          />
        ) : null}

        {progress ? (
          <p className="text-sm fuwari-text-50">
            {m.media_uploading({
              current: progress.current,
              total: progress.total,
            })}
          </p>
        ) : null}

        {isPending ? (
          <MediaLibraryGridSkeleton />
        ) : isEmpty ? (
          <div
            className={cn(
              "min-h-80 rounded-2xl border border-dashed border-(--fuwari-input-border) flex flex-col items-center justify-center gap-2 text-center px-6 py-16",
              isDefaultEmpty && "cursor-pointer",
            )}
            onClick={isDefaultEmpty ? openFilePicker : undefined}
          >
            <p className="font-medium fuwari-text-75">{m.media_empty()}</p>
            {isDefaultEmpty ? (
              <>
                <p className="text-sm fuwari-text-50">{m.media_empty_hint()}</p>
                <button
                  type="button"
                  className="mt-2 fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
                >
                  {m.media_choose()}
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <MediaGrid
            media={mediaItems}
            onSelect={setPreview}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
          />
        )}
      </div>

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

      <MediaDetail
        asset={preview}
        onClose={() => setPreview(null)}
        onRename={(key, name) => rename({ key, name })}
        onReplace={async (key, file) => {
          const next = await replaceFile({ key, image: file });
          if (next) {
            setPreview((prev) =>
              prev
                ? { ...prev, ...next }
                : { ...next, postCount: 0, isCover: false },
            );
          }
        }}
        onDelete={(asset) => setDeleteTarget({ kind: "one", asset })}
        isReplacing={isReplacing}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={m.media_delete_title()}
        message={
          deleteTarget?.kind === "one"
            ? m.media_delete_one({ name: deleteTarget.asset.fileName })
            : m.media_delete_unused({ count: stats?.unusedCount ?? 0 })
        }
        confirmLabel={m.media_delete()}
        isDanger
        isLoading={isDeleting}
      />
    </div>
  );
}

function MediaLibraryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square rounded-xl bg-(--fuwari-btn-regular-bg)" />
          <div className="h-4 w-3/4 rounded-lg bg-(--fuwari-btn-regular-bg)" />
          <div className="h-3 w-1/2 rounded-lg bg-(--fuwari-btn-regular-bg)" />
        </div>
      ))}
    </div>
  );
}
