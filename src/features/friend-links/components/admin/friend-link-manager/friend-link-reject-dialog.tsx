import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { Textarea } from "@/components/ui/input";
import { QuotedText } from "@/components/ui/quoted-text";
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
          <QuotedText>
            {removing
              ? m.friend_links_remove_hint()
              : m.friend_links_reject_hint()}
          </QuotedText>
        </p>
        <FormField label={m.friend_links_reject_reason()} className="mt-4">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder={m.friend_links_reject_reason_ph()}
            className="resize-none"
          />
        </FormField>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} disabled={isSaving}>
            {m.common_cancel()}
          </Button>
          {/* Rejecting is a warning, not a deletion, so it keeps the warning colours. */}
          <Button
            onClick={() => onConfirm(reason.trim() || undefined)}
            loading={isSaving}
            className="bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg)"
          >
            {removing
              ? m.friend_links_remove_confirm()
              : m.friend_links_action_reject()}
          </Button>
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
