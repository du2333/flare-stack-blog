import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { m } from "@/paraglide/messages";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "./types";

interface PostEditorHeaderProps {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  processState: "IDLE" | "PROCESSING" | "SUCCESS";
  canPublish: boolean;
  hasPublicSnapshot: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onOpenInfo: () => void;
}

function saveLabel(saveStatus: SaveStatus, lastSaved: Date | null) {
  switch (saveStatus) {
    case "ERROR":
      return m.editor_status_save_error();
    case "SAVING":
      return m.editor_status_saving();
    case "PENDING":
      return m.editor_status_unsaved();
    default:
      return lastSaved
        ? m.editor_status_saved({
            time: lastSaved.toLocaleTimeString([], {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            }),
          })
        : m.editor_status_synced();
  }
}

export function PostEditorHeader({
  saveStatus,
  lastSaved,
  processState,
  canPublish,
  hasPublicSnapshot,
  onPublish,
  onUnpublish,
  onOpenInfo,
}: PostEditorHeaderProps) {
  const busy = processState !== "IDLE";
  const publishLabel =
    processState === "PROCESSING"
      ? m.editor_header_processing()
      : processState === "SUCCESS"
        ? m.editor_header_success()
        : m.editor_header_publish();

  return (
    <div className="flex shrink-0 items-center gap-2 px-5 pt-5 pb-3">
      <Link
        to="/admin/posts"
        className="hidden h-9 items-center rounded-xl px-2 text-sm fuwari-text-50 hover:text-(--fuwari-primary) lg:inline-flex"
      >
        {m.editor_back_to_posts()}
      </Link>
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          saveStatus === "ERROR"
            ? "text-(--fuwari-danger-fg)"
            : saveStatus === "PENDING"
              ? "text-(--fuwari-warning-fg)"
              : "fuwari-text-50",
        )}
      >
        {saveLabel(saveStatus, lastSaved)}
      </p>
      <button
        type="button"
        onClick={onOpenInfo}
        className="h-9 rounded-xl px-3 text-sm fuwari-btn-regular lg:hidden"
      >
        {m.editor_info_title()}
      </button>
      {hasPublicSnapshot ? (
        <button
          type="button"
          onClick={onUnpublish}
          disabled={busy}
          className="h-9 rounded-xl px-3 text-sm fuwari-text-50 hover:text-(--fuwari-warning-fg) disabled:opacity-40"
        >
          {m.editor_header_unpublish()}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onPublish}
        disabled={busy || !canPublish}
        className="hidden h-9 items-center rounded-xl px-4 text-sm font-medium fuwari-btn-primary disabled:opacity-40 lg:inline-flex"
      >
        {processState === "PROCESSING" ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : null}
        {publishLabel}
      </button>
    </div>
  );
}
