import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2, MoreHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
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
  infoOpen: boolean;
  onOpenHistory: () => void;
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
  infoOpen,
  onOpenHistory,
}: PostEditorHeaderProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        menuRef.current.open = false;
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);
  const busy = processState !== "IDLE";
  const publishLabel =
    processState === "PROCESSING"
      ? m.editor_header_processing()
      : processState === "SUCCESS"
        ? m.editor_header_success()
        : m.editor_header_publish();
  return (
    <header className="post-editor-header">
      <Link
        to="/admin/posts"
        className="post-editor-back hidden lg:inline-flex"
      >
        <ArrowLeft size={17} />
        {m.editor_back_to_posts()}
      </Link>
      <p
        role="status"
        className={cn(
          "post-editor-save",
          saveStatus === "ERROR"
            ? "text-(--fuwari-danger-fg)"
            : saveStatus === "PENDING"
              ? "text-(--fuwari-warning-fg)"
              : "fuwari-text-50",
        )}
      >
        {saveStatus === "SAVING" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : saveStatus === "SYNCED" ? (
          <Check size={15} />
        ) : null}
        <span>{saveLabel(saveStatus, lastSaved)}</span>
      </p>
      <div className="post-editor-header-actions">
        <button
          type="button"
          onClick={onOpenInfo}
          aria-expanded={infoOpen}
          className={cn(
            "post-editor-text-button",
            infoOpen && "bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)",
          )}
        >
          {m.editor_info_title()}
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="post-editor-text-button"
        >
          {m.editor_history_list_title()}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={busy || !canPublish}
          className="hidden h-9 items-center rounded-lg px-5 text-sm font-medium fuwari-btn-primary disabled:opacity-40 lg:inline-flex"
        >
          {processState === "PROCESSING" ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : null}
          {publishLabel}
        </button>
        {hasPublicSnapshot && (
          <details
            ref={menuRef}
            className="post-editor-more"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              className="post-editor-icon-button"
              aria-label={m.editor_more_actions()}
              title={m.editor_more_actions()}
            >
              <MoreHorizontal size={19} />
            </summary>
            <div className="post-editor-more-menu">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (menuRef.current) menuRef.current.open = false;
                  onUnpublish();
                }}
              >
                {m.editor_header_unpublish()}
              </button>
            </div>
          </details>
        )}
      </div>
    </header>
  );
}
