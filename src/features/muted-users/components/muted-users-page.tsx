import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import type { MutedUser } from "@/features/muted-users/muted-users.schema";
import { mutedUsersQuery } from "@/features/muted-users/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { MutedUsersListSkeleton } from "./muted-users-skeleton";

export function MutedUsersPage() {
  const {
    data: mutedUsers = [],
    isPending,
    isError,
  } = useQuery(mutedUsersQuery);
  const { unmuteUser, isUnmuting } = useMutedUsers();
  const [pending, setPending] = useState<MutedUser | null>(null);

  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <h1 className="hidden lg:block text-2xl font-medium fuwari-text-90">
        {m.muted_users_title()}
      </h1>

      {isError ? (
        <p className="py-16 text-center text-sm fuwari-text-50">
          {m.muted_users_toast_error()}
        </p>
      ) : isPending ? (
        <MutedUsersListSkeleton />
      ) : mutedUsers.length === 0 ? (
        <p className="py-16 text-center text-sm fuwari-text-50">
          {m.muted_users_empty()}
        </p>
      ) : (
        <div>
          {mutedUsers.map((item) => (
            <MutedUserRow
              key={item.id}
              user={item}
              busy={isUnmuting}
              onUnmute={setPending}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          await unmuteUser({ userId: pending.id });
          setPending(null);
        }}
        title={m.muted_users_unmute()}
        message={m.muted_users_unmute_message({
          name: pending?.name ?? "",
        })}
        confirmLabel={m.muted_users_unmute()}
        isLoading={isUnmuting}
      />
    </div>
  );
}

function MutedUserRow({
  user,
  busy,
  onUnmute,
}: {
  user: MutedUser;
  busy: boolean;
  onUnmute: (user: MutedUser) => void;
}) {
  return (
    <div className="px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 border-b border-(--fuwari-input-border) last:border-0">
      <div className="min-w-0 flex-1 flex gap-3">
        <Avatar name={user.name} image={user.image} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-base fuwari-text-90 truncate">
            {user.name}
          </h3>
          <p className="mt-1 text-xs fuwari-text-30">
            <ClientOnly fallback="-">
              {m.muted_users_muted_at({
                date: formatDate(user.mutedAt, { includeTime: true }),
              })}
            </ClientOnly>
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUnmute(user)}
        className="fuwari-btn-regular rounded-xl h-9 px-3 text-sm disabled:opacity-50 shrink-0"
      >
        {m.muted_users_unmute()}
      </button>
    </div>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const initial = name.slice(0, 1) || "?";

  if (!image) {
    return (
      <div className="w-10 h-10 rounded-full bg-(--fuwari-btn-regular-bg) grid place-items-center text-sm font-medium fuwari-text-50 shrink-0">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={image}
      alt=""
      className="w-10 h-10 rounded-full object-cover shrink-0"
    />
  );
}
