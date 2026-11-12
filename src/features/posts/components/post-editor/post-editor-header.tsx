import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  EyeOff,
  History,
  PanelRight,
  Pause,
  Trash2,
  Undo2,
} from "lucide-react";
import { useRef, useState } from "react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Spinner } from "@/components/ui/spinner";
import { readPostListLocation } from "../post-manager/list-position";
import { postStateOf, publishActionLabel } from "../post-state";
import { PostStatusBadge } from "../post-status-badge";
import { openPublicPost } from "@/features/posts/utils/open-public-post";
import { m } from "@/paraglide/messages";
import type { SaveStatus } from "./types";

interface PostEditorHeaderProps {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  processState: "IDLE" | "PROCESSING" | "SUCCESS";
  canPublish: boolean;
  /** A save was refused; going live or back to a draft waits for the Admin. */
  conflicted: boolean;
  /** The link was left out of the saves: invalid, reserved or taken. */
  slugWithheld: boolean;
  hasPublicSnapshot: boolean;
  /** The draft differs from the published version. */
  hasUnpublishedChanges: boolean;
  publicSlug: string | null;
  title: string;
  onPublish: () => void;
  onUnpublish: () => void;
  onDiscard: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onOpenInfo: () => void;
  infoOpen: boolean;
  onOpenHistory: () => void;
}

function saveLabel(
  saveStatus: SaveStatus,
  lastSaved: Date | null,
  conflicted: boolean,
  slugWithheld: boolean,
) {
  switch (saveStatus) {
    case "ERROR":
      // An Edit Conflict is not a failure: autosave waits for the Admin.
      return conflicted
        ? m.editor_status_paused()
        : m.editor_status_save_error();
    case "SAVING":
      return m.editor_status_saving();
    case "PENDING":
      return m.editor_status_unsaved();
    default: {
      if (!lastSaved) return m.editor_status_draft_saved();
      const time = lastSaved.toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      // The rest was saved; the field says why the link was not.
      return slugWithheld
        ? m.editor_status_saved_except_link({ time })
        : m.editor_status_saved({ time });
    }
  }
}

export function PostEditorHeader({
  saveStatus,
  lastSaved,
  processState,
  canPublish,
  conflicted,
  slugWithheld,
  hasPublicSnapshot,
  hasUnpublishedChanges,
  publicSlug,
  title,
  onPublish,
  onUnpublish,
  onDiscard,
  onDelete,
  isDeleting,
  onOpenInfo,
  infoOpen,
  onOpenHistory,
}: PostEditorHeaderProps) {
  const [returnLocation] = useState(readPostListLocation);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const busy = processState !== "IDLE";
  const actions: Array<ActionMenuItem> = [];
  if (publicSlug)
    actions.push({
      label: m.admin_posts_action_view_live(),
      icon: ExternalLink,
      onSelect: () => openPublicPost(publicSlug),
    });
  if (hasPublicSnapshot && hasUnpublishedChanges)
    actions.push({
      label: m.editor_header_discard(),
      icon: Undo2,
      disabled: busy || conflicted,
      onSelect: (trigger) => {
        menuTriggerRef.current = trigger;
        setConfirmingDiscard(true);
      },
    });
  if (hasPublicSnapshot)
    actions.push({
      label: m.editor_header_unpublish(),
      icon: EyeOff,
      danger: true,
      disabled: busy || conflicted,
      onSelect: (trigger) => {
        menuTriggerRef.current = trigger;
        setConfirmingUnpublish(true);
      },
    });
  actions.push({
    label: m.admin_posts_action_delete_post(),
    icon: Trash2,
    danger: true,
    separator: actions.length > 0,
    disabled: busy,
    onSelect: (trigger) => {
      menuTriggerRef.current = trigger;
      setConfirmingDelete(true);
    },
  });
  const state = postStateOf({
    published: hasPublicSnapshot,
    hasUnpublishedChanges,
  });
  const publishLabel =
    processState === "PROCESSING"
      ? m.editor_header_processing()
      : processState === "SUCCESS"
        ? m.editor_header_success()
        : publishActionLabel(state);
  return (
    <header className="post-editor-header">
      <Link
        to="/admin/posts"
        search={returnLocation}
        className="post-editor-back"
        aria-label={m.editor_back_to_posts()}
      >
        <ArrowLeft size={17} />
        <span>{m.admin_posts_title()}</span>
      </Link>
      <div className="post-editor-status">
        <PostStatusBadge state={state} />
        <p
          role="status"
          className="post-editor-save"
          data-state={
            conflicted
              ? "paused"
              : saveStatus === "ERROR"
                ? "error"
                : saveStatus === "PENDING"
                  ? "pending"
                  : saveStatus === "SAVING"
                    ? "saving"
                    : "saved"
          }
        >
          {saveStatus === "SAVING" ? (
            <Spinner size={14} />
          ) : conflicted ? (
            <Pause size={14} />
          ) : saveStatus === "SYNCED" ? (
            <Check size={14} />
          ) : (
            <i aria-hidden="true" />
          )}
          <span>
            {saveLabel(saveStatus, lastSaved, conflicted, slugWithheld)}
          </span>
        </p>
      </div>
      <div className="post-editor-header-actions">
        <Button
          variant="plain"
          icon={<PanelRight size={16} />}
          onClick={onOpenInfo}
          aria-expanded={infoOpen}
          aria-label={m.editor_info_title()}
          className="post-editor-header-tool"
        >
          <span>{m.editor_info_title()}</span>
        </Button>
        <Button
          variant="plain"
          icon={<History size={16} />}
          onClick={onOpenHistory}
          aria-label={m.editor_history_list_title()}
          className="post-editor-header-tool"
        >
          <span>{m.editor_history_list_title()}</span>
        </Button>
        <Button
          variant="primary"
          onClick={onPublish}
          disabled={busy || !canPublish}
          loading={processState === "PROCESSING"}
          className="post-editor-publish"
        >
          {publishLabel}
        </Button>
        <ActionMenu label={m.editor_more_actions()} items={actions} />
      </div>
      <ConfirmationModal
        isOpen={confirmingDiscard}
        title={m.editor_discard_confirm_title()}
        message={m.editor_discard_confirm_desc()}
        confirmLabel={m.editor_header_discard()}
        isDanger
        onClose={() => setConfirmingDiscard(false)}
        onConfirm={() => {
          setConfirmingDiscard(false);
          onDiscard();
        }}
        returnFocus={() => menuTriggerRef.current}
      />
      <ConfirmationModal
        isOpen={confirmingUnpublish}
        title={m.editor_unpublish_confirm_title()}
        message={m.editor_unpublish_confirm_desc()}
        confirmLabel={m.editor_header_unpublish()}
        isDanger
        onClose={() => setConfirmingUnpublish(false)}
        onConfirm={() => {
          setConfirmingUnpublish(false);
          onUnpublish();
        }}
        returnFocus={() => menuTriggerRef.current}
      />
      <ConfirmationModal
        isOpen={confirmingDelete}
        title={m.admin_posts_delete_confirm_title()}
        message={m.admin_posts_delete_confirm_desc({
          title: title.trim() || m.common_untitled(),
        })}
        confirmLabel={m.admin_posts_delete_confirm_btn()}
        isDanger
        isLoading={isDeleting}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={onDelete}
        returnFocus={() => menuTriggerRef.current}
      />
    </header>
  );
}
