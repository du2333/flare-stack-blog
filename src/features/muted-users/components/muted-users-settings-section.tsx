import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { CircleAlert, Search, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { SearchField } from "@/components/ui/search-field";
import DropdownMenu from "@/components/ui/dropdown-menu";
import { SettingsShell } from "@/features/config/components/admin/settings-shell";
import { useContentMotion } from "@/hooks/use-motion";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import type { MutedUser } from "@/features/muted-users/muted-users.schema";
import { mutedUsersQuery } from "@/features/muted-users/queries";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { m } from "@/paraglide/messages";
import { MutedUsersListSkeleton } from "./muted-users-skeleton";
import "./muted-users.css";

export function MutedUsersSettingsSection() {
  const { data, isPending, isError, refetch } = useQuery({
    ...mutedUsersQuery,
    refetchOnMount: "always",
  });
  const { unmuteUser, isUnmuting } = useMutedUsers();
  const [pending, setPending] = useState<MutedUser | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (data ?? [])
      .filter((user) => !term || user.name.toLocaleLowerCase().includes(term))
      .sort((a, b) => {
        const byDate =
          new Date(b.mutedAt).getTime() - new Date(a.mutedAt).getTime();
        return (
          (sort === "name"
            ? a.name.localeCompare(b.name)
            : sort === "oldest"
              ? -byDate
              : byDate) || a.id.localeCompare(b.id)
        );
      });
  }, [data, search, sort]);
  useContentMotion(
    contentRef,
    `${isPending}:${isError}:${items.map((user) => user.id).join(",")}`,
  );
  const clearSearch = () => {
    setSearch("");
    searchRef.current?.focus();
  };
  const tools = (
    <>
      <SearchField
        ref={searchRef}
        variant="raised"
        shortcut="/"
        value={search}
        onValueChange={setSearch}
        placeholder={m.muted_manager_search()}
        aria-label={m.muted_manager_search()}
        maxLength={200}
        clearLabel={m.muted_manager_clear()}
      />
      <DropdownMenu
        variant="chip"
        ariaLabel={m.muted_manager_sort()}
        value={sort}
        onChange={setSort}
        options={[
          { value: "recent", label: m.muted_manager_recent() },
          { value: "oldest", label: m.muted_manager_oldest() },
          { value: "name", label: m.muted_manager_name() },
        ]}
      />
    </>
  );
  return (
    <SettingsShell
      title={m.muted_users_title()}
      section="muted-users"
      regionLabel={m.muted_users_title()}
      count={isPending || isError ? undefined : (data?.length ?? 0)}
      description={m.muted_manager_hint()}
      tools={tools}
      body="list"
      scrollKey={`${search}\0${sort}`}
    >
      <div className="muted-users">
        <div ref={contentRef} aria-busy={isPending}>
          {isError ? (
            <EmptyState
              variant="tile"
              role="alert"
              icon={CircleAlert}
              description={m.muted_users_toast_error()}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                >
                  {m.muted_manager_retry()}
                </Button>
              }
            />
          ) : isPending ? (
            <MutedUsersListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              variant="tile"
              icon={data?.length ? Search : ShieldCheck}
              title={
                data?.length
                  ? m.muted_manager_no_results()
                  : m.muted_users_empty()
              }
              description={
                data?.length
                  ? m.muted_manager_search_hint()
                  : m.muted_manager_empty_hint()
              }
              action={
                search && (
                  <Button variant="outline" size="sm" onClick={clearSearch}>
                    {m.muted_manager_clear()}
                  </Button>
                )
              }
            />
          ) : (
            <ul className="muted-list">
              {items.map((user) => (
                <li key={user.id} className="admin-list-row muted-row">
                  <Avatar image={user.image} />
                  <h3 className="muted-name" title={user.name}>
                    {user.name}
                  </h3>
                  <p className="muted-since">
                    <ClientOnly fallback="—">
                      {m.muted_users_muted_at({
                        date: formatDate(user.mutedAt, {
                          includeTime: true,
                        }),
                      })}
                    </ClientOnly>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUnmuting}
                    onClick={() => setPending(user)}
                    aria-label={m.muted_manager_unmute_named({
                      name: user.name,
                    })}
                  >
                    {m.muted_users_unmute()}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="muted-footer" role="status">
          {!isPending && !isError && search.trim() && items.length > 0
            ? m.muted_manager_results({
                shown: items.length,
                total: data?.length ?? 0,
              })
            : null}
        </footer>
        <ConfirmationModal
          isOpen={pending !== null}
          onClose={() => {
            if (!isUnmuting) setPending(null);
          }}
          onConfirm={async () => {
            if (!pending || isUnmuting) return;
            try {
              await unmuteUser({ userId: pending.id });
              setPending(null);
            } catch {
              /* The mutation displays the error; keep the dialog available for retry. */
            }
          }}
          title={m.muted_users_unmute()}
          message={m.muted_users_unmute_message({ name: pending?.name ?? "" })}
          confirmLabel={m.muted_users_unmute()}
          isLoading={isUnmuting}
          fallbackFocus={() => searchRef.current}
        />
      </div>
    </SettingsShell>
  );
}

function Avatar({ image }: { image: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className="muted-avatar" aria-hidden="true">
      {image && image !== failedUrl ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(image)}
        />
      ) : (
        <UserRound size={16} />
      )}
    </span>
  );
}
