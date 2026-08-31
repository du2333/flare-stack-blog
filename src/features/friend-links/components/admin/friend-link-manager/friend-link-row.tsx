import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function siteHost(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function SiteLogo({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const initial = name.slice(0, 1) || "?";

  if (!url || failed) {
    return (
      <div className="w-10 h-10 rounded-xl bg-(--fuwari-btn-regular-bg) grid place-items-center text-sm font-medium fuwari-text-50 shrink-0">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="w-10 h-10 rounded-xl object-cover shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

const statusClass = {
  pending: "bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg)",
  approved: "bg-(--fuwari-success-bg) text-(--fuwari-success-fg)",
  rejected: "bg-(--fuwari-btn-regular-bg) fuwari-text-50",
} as const;

const statusLabel = {
  pending: () => m.friend_links_tab_pending(),
  approved: () => m.friend_links_tab_approved(),
  rejected: () => m.friend_links_tab_rejected(),
} as const;

interface FriendLinkRowProps {
  link: FriendLinkWithUser;
  busy: boolean;
  onApprove: (link: FriendLinkWithUser) => void;
  onReject: (link: FriendLinkWithUser) => void;
  onEdit: (link: FriendLinkWithUser) => void;
  onDelete: (link: FriendLinkWithUser) => void;
}

export function FriendLinkRow({
  link,
  busy,
  onApprove,
  onReject,
  onEdit,
  onDelete,
}: FriendLinkRowProps) {
  const submitter = link.user?.name || m.friend_links_admin_added();

  return (
    <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 border-b border-(--fuwari-input-border) last:border-0">
      <div className="min-w-0 flex-1 flex gap-3">
        <SiteLogo url={link.logoUrl} name={link.siteName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-base fuwari-text-90 truncate">
              {link.siteName}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${statusClass[link.status]}`}
            >
              {statusLabel[link.status]()}
            </span>
          </div>
          {link.description ? (
            <p className="text-sm fuwari-text-50 truncate">
              {link.description}
            </p>
          ) : null}
          <p className="mt-1 text-xs fuwari-text-30 truncate">
            <a
              href={link.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-(--fuwari-primary)"
            >
              {siteHost(link.siteUrl)}
            </a>
            {" · "}
            {submitter}
            {" · "}
            <ClientOnly fallback="-">{formatDate(link.createdAt)}</ClientOnly>
          </p>
          {link.status === "rejected" && link.rejectionReason ? (
            <p className="mt-1 text-xs text-(--fuwari-warning-fg)">
              {link.rejectionReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {link.status !== "approved" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onApprove(link)}
            className="rounded-xl h-9 px-3 text-sm font-medium bg-(--fuwari-success-bg) text-(--fuwari-success-fg) disabled:opacity-50"
          >
            {m.friend_links_action_pass()}
          </button>
        ) : null}

        {link.status === "pending" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(link)}
            className="rounded-xl h-9 px-3 text-sm font-medium bg-(--fuwari-warning-bg) text-(--fuwari-warning-fg) disabled:opacity-50"
          >
            {m.friend_links_action_reject()}
          </button>
        ) : null}

        {link.status === "approved" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit(link)}
              className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm disabled:opacity-50"
            >
              {m.friend_links_action_edit()}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(link)}
              className="rounded-xl h-9 px-3 text-sm fuwari-text-50 hover:text-(--fuwari-primary) disabled:opacity-50"
            >
              {m.friend_links_action_remove()}
            </button>
          </>
        ) : null}

        {link.status !== "pending" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(link)}
            className="rounded-xl h-9 px-3 text-sm fuwari-text-50 hover:text-(--fuwari-danger-fg) disabled:opacity-50"
          >
            {m.friend_links_action_delete()}
          </button>
        ) : null}
      </div>
    </div>
  );
}
