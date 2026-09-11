import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { AdminPagination } from "@/components/admin/admin-pagination";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import type {
  FriendLinkStatusCounts,
  FriendLinkWithUser,
} from "@/features/friend-links/friend-links.schema";
import { useAdminFriendLinks } from "@/features/friend-links/hooks/use-friend-links";
import { allFriendLinksQuery } from "@/features/friend-links/queries";
import type { FriendLinkStatus } from "@/lib/db/schema";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { FriendLinkFormDialog } from "./friend-link-form-dialog";
import { FriendLinkRejectDialog } from "./friend-link-reject-dialog";
import { FriendLinkReview } from "./friend-link-review";
import "./friend-link-manager.css";

const STATUSES: Array<FriendLinkStatus> = ["pending", "approved", "rejected"];

const emptyCounts: FriendLinkStatusCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
};

interface FriendLinkManagerProps {
  status: FriendLinkStatus;
  page: number;
  onStatusChange: (status: FriendLinkStatus) => void;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function FriendLinkManager({
  status,
  page,
  onStatusChange,
  onPageChange,
  search,
  onSearchChange,
}: FriendLinkManagerProps) {
  const navigate = useNavigate();
  const { setPrimaryAction } = useAdminChrome();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FriendLinkWithUser | null>(null);
  const [rejecting, setRejecting] = useState<FriendLinkWithUser | null>(null);
  const [deleting, setDeleting] = useState<FriendLinkWithUser | null>(null);
  const countsRef = useRef(emptyCounts);

  const { data, isPending, isError } = useQuery(
    allFriendLinksQuery({
      status,
      search,
      limit: ADMIN_ITEMS_PER_PAGE,
      offset: (page - 1) * ADMIN_ITEMS_PER_PAGE,
    }),
  );

  if (data?.counts) countsRef.current = data.counts;
  const counts = data?.counts ?? countsRef.current;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ITEMS_PER_PAGE));

  const {
    create,
    update,
    approve,
    reject,
    adminDelete,
    isCreating,
    isUpdating,
    isApproving,
    isRejecting,
    isAdminDeleting,
  } = useAdminFriendLinks();

  const busy =
    isCreating || isUpdating || isApproving || isRejecting || isAdminDeleting;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useEffect(() => {
    setPrimaryAction({
      label: m.friend_links_admin_add(),
      onClick: () => {
        setEditing(null);
        setFormOpen(true);
      },
    });
    return () => setPrimaryAction(null);
  }, [setPrimaryAction]);

  useEffect(() => {
    if (data && page > totalPages) onPageChange(totalPages);
  }, [data, page, totalPages, onPageChange]);

  const emptyCopy = {
    pending: m.friend_links_empty_pending(),
    approved: m.friend_links_empty_approved(),
    rejected: m.friend_links_empty_rejected(),
  }[status];

  return (
    <div className="friend-workspace fuwari-card-base">
      <header className="friend-header">
        <div>
          <h1>{m.friend_links_admin_title()}</h1>
          <p>{m.friend_review_hint()}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="fuwari-btn-regular friend-button"
        >
          {m.friend_links_admin_add()}
        </button>
      </header>
      <nav className="friend-tabs" aria-label={m.friend_links_admin_title()}>
        {STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={status === item ? "page" : undefined}
            onClick={() => onStatusChange(item)}
            className={cn(status === item && "active")}
          >
            {
              {
                pending: m.friend_links_tab_pending(),
                approved: m.friend_links_tab_approved(),
                rejected: m.friend_links_tab_rejected(),
              }[item]
            }{" "}
            <span>{counts[item]}</span>
          </button>
        ))}
      </nav>
      <FriendLinkReview
        key={status}
        items={items}
        busy={busy}
        loading={isPending}
        error={isError}
        emptyCopy={emptyCopy}
        search={search}
        onSearchChange={onSearchChange}
        page={page}
        onApprove={(item) => approve({ id: item.id })}
        onReject={setRejecting}
        onEdit={(item) => {
          setEditing(item);
          setFormOpen(true);
        }}
        onDelete={setDeleting}
        pagination={
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={ADMIN_ITEMS_PER_PAGE}
            currentPageItemCount={items.length}
            onPageChange={onPageChange}
          />
        }
      />

      <FriendLinkFormDialog
        open={formOpen}
        link={editing}
        isSaving={isCreating || isUpdating}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => {
          if (editing) {
            update(
              { id: editing.id, ...input },
              {
                onSuccess: () => {
                  setFormOpen(false);
                  setEditing(null);
                },
              },
            );
            return;
          }
          create(input, {
            onSuccess: () => {
              setFormOpen(false);
              if (status !== "approved") {
                navigate({
                  to: "/admin/friend-links",
                  search: { status: "approved", page: 1 },
                });
              }
            },
          });
        }}
      />

      <FriendLinkRejectDialog
        link={rejecting}
        isSaving={isRejecting}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (!rejecting) return;
          reject(
            { id: rejecting.id, rejectionReason: reason },
            { onSuccess: () => setRejecting(null) },
          );
        }}
      />

      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          adminDelete(
            { id: deleting.id },
            { onSuccess: () => setDeleting(null) },
          );
        }}
        title={m.friend_links_delete_title()}
        message={m.friend_links_delete_message({
          name: deleting?.siteName ?? "",
        })}
        confirmLabel={m.friend_links_delete_confirm()}
        isDanger
        isLoading={isAdminDeleting}
      />
    </div>
  );
}
