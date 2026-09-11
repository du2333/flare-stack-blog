import { ClientOnly } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { m } from "@/paraglide/messages";

interface FriendLinkRejectDialogProps {
  link: FriendLinkWithUser | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

function FriendLinkRejectDialogInternal({
  link,
  isSaving,
  onClose,
  onConfirm,
}: FriendLinkRejectDialogProps) {
  const open = link !== null;
  const removing = link?.status === "approved";
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open, link?.id]);

  return (
    <FuwariModal
      open={open}
      onClose={onClose}
      busy={isSaving}
      labelledBy="friend-link-reject-title"
      className="max-w-[440px]"
    >
      <div className="p-6">
        <h2
          id="friend-link-reject-title"
          className="text-lg font-medium fuwari-text-90"
        >
          {removing
            ? m.friend_links_remove_named({ name: link?.siteName ?? "" })
            : m.friend_links_reject_named({ name: link?.siteName ?? "" })}
        </h2>
        <p className="mt-2 text-sm leading-relaxed fuwari-text-75">
          {removing
            ? m.friend_links_remove_hint()
            : m.friend_links_reject_hint()}
        </p>
        <label className="mt-4 grid gap-1.5 text-sm fuwari-text-50">
          {m.friend_links_reject_reason()}
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={m.friend_links_reject_reason_ph()}
            className="px-3 py-2 rounded-xl bg-(--fuwari-btn-regular-bg) text-sm fuwari-text-90 outline-none resize-none"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="fuwari-btn-regular rounded-xl h-10 px-4 text-sm font-medium disabled:opacity-50"
          >
            {m.common_cancel()}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim() || undefined)}
            disabled={isSaving}
            className="rounded-xl h-10 px-4 text-sm font-medium bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            {removing
              ? m.friend_links_remove_confirm()
              : m.friend_links_action_reject()}
          </button>
        </div>
      </div>
    </FuwariModal>
  );
}

export function FriendLinkRejectDialog(props: FriendLinkRejectDialogProps) {
  return (
    <ClientOnly>
      <FriendLinkRejectDialogInternal {...props} />
    </ClientOnly>
  );
}
