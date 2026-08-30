import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import { mutedUsersQuery } from "@/features/muted-users/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function MutedUsersPage() {
  const { data: mutedUsers = [], isLoading } = useQuery(mutedUsersQuery);
  const { unmuteUser, isUnmuting } = useMutedUsers();
  const [pending, setPending] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  return (
    <div
      data-admin-legacy
      className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000"
    >
      <div className="space-y-1 border-b border-border/30 pb-6">
        <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
          {m.muted_users_title()}
        </h1>
        <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
          {m.muted_users_tag()}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground font-mono">
          {m.muted_users_loading()}
        </p>
      ) : mutedUsers.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <p className="text-sm text-foreground">{m.muted_users_empty()}</p>
          <p className="text-sm text-muted-foreground">
            {m.muted_users_empty_hint()}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30 border border-border/30">
          {mutedUsers.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-4 px-4 py-4 md:px-6"
            >
              <div className="w-9 h-9 shrink-0 border border-border/30 overflow-hidden bg-muted/20 flex items-center justify-center">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-mono text-muted-foreground">
                    {item.name.slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {m.muted_users_muted_at({
                    date: formatDate(item.mutedAt, { includeTime: true }),
                  })}
                </p>
              </div>
              <button
                onClick={() =>
                  setPending({ userId: item.id, userName: item.name })
                }
                className="h-8 px-3 text-[10px] font-mono uppercase tracking-widest border border-border/30 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                {m.muted_users_unmute()}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          await unmuteUser({ userId: pending.userId });
          setPending(null);
        }}
        title={m.muted_users_unmute_title()}
        message={m.muted_users_unmute_desc({
          name: pending?.userName ?? "",
        })}
        confirmLabel={m.muted_users_unmute_confirm()}
        isLoading={isUnmuting}
      />
    </div>
  );
}
