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
import { FriendLinkManagerSkeleton } from "./friend-link-manager-skeleton";
import { FriendLinkRejectDialog } from "./friend-link-reject-dialog";
import { FriendLinkRow } from "./friend-link-row";

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
}

export function FriendLinkManager({
  status,
  page,
  onStatusChange,
  onPageChange,
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

  const emptyCopy = {
    pending: m.friend_links_empty_pending(),
    approved: m.friend_links_empty_approved(),
    rejected: m.friend_links_empty_rejected(),
  }[status];

  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <div className="hidden lg:flex justify-between items-center">
        <h1 className="text-2xl font-medium fuwari-text-90">
          {m.friend_links_admin_title()}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
        >
          {m.friend_links_admin_add()}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onStatusChange(item)}
            className={cn(
              "rounded-xl h-9 px-3 text-sm font-medium inline-flex items-center gap-1.5",
              status === item ? "fuwari-btn-primary" : "fuwari-btn-regular",
            )}
          >
            {
              {
                pending: m.friend_links_tab_pending(),
                approved: m.friend_links_tab_approved(),
                rejected: m.friend_links_tab_rejected(),
              }[item]
            }
            <span className="text-xs tabular-nums opacity-80">
              {counts[item]}
            </span>
          </button>
        ))}
      </div>

      {isError ? (
        <p className="py-16 text-center text-sm fuwari-text-50">
          {m.friend_links_admin_load_fail()}
        </p>
      ) : isPending ? (
        <FriendLinkManagerSkeleton />
      ) : items.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 fuwari-text-50">
          <p>{emptyCopy}</p>
          {status === "approved" ? (
            <button
              type="button"
              onClick={openCreate}
              className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium"
            >
              {m.friend_links_admin_add()}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div>
            {items.map((link) => (
              <FriendLinkRow
                key={link.id}
                link={link}
                busy={busy}
                onApprove={(item) => approve({ id: item.id })}
                onReject={setRejecting}
                onEdit={(item) => {
                  setEditing(item);
                  setFormOpen(true);
                }}
                onDelete={setDeleting}
              />
            ))}
          </div>
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={ADMIN_ITEMS_PER_PAGE}
            currentPageItemCount={items.length}
            onPageChange={onPageChange}
          />
        </>
      )}

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
