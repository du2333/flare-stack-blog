import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { SearchField } from "@/components/ui/search-field";
import { Select } from "@/components/ui/select";
import { SettingsLead } from "@/features/config/components/admin/settings-lead";
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
  const scrollRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [search, sort]);
  const clearSearch = () => {
    setSearch("");
    searchRef.current?.focus();
  };
  return (
    <div className="muted-users settings-column">
      <SettingsLead
        description={m.muted_manager_hint()}
        actions={
          <Badge tone="primary">
            {isPending || isError
              ? "—"
              : m.muted_manager_count({ count: data?.length ?? 0 })}
          </Badge>
        }
      />
      <div className="muted-toolbar">
        <SearchField
          ref={searchRef}
          className="muted-search"
          value={search}
          onValueChange={setSearch}
          placeholder={m.muted_manager_search()}
          aria-label={m.muted_manager_search()}
          maxLength={200}
          clearLabel={m.muted_manager_clear()}
        />
        <div className="muted-sort">
          <span>{m.muted_manager_sort()}</span>
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: m.muted_manager_recent() },
              { value: "oldest", label: m.muted_manager_oldest() },
              { value: "name", label: m.muted_manager_name() },
            ]}
          />
        </div>
      </div>
      <div className="muted-list-scroll" ref={scrollRef} aria-busy={isPending}>
        <div ref={contentRef}>
          {isError ? (
            <EmptyState
              role="alert"
              description={m.muted_users_toast_error()}
              action={
                <Button onClick={() => void refetch()}>
                  {m.muted_manager_retry()}
                </Button>
              }
            />
          ) : isPending ? (
            <MutedUsersListSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
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
                  <Button onClick={clearSearch}>
                    {m.muted_manager_clear()}
                  </Button>
                )
              }
            />
          ) : (
            <ul className="muted-list">
              {items.map((user) => (
                <li key={user.id} className="muted-row">
                  <Avatar image={user.image} />
                  <div className="muted-user">
                    <h3>{user.name}</h3>
                    <p>
                      <ClientOnly fallback="—">
                        {m.muted_users_muted_at({
                          date: formatDate(user.mutedAt, { includeTime: true }),
                        })}
                      </ClientOnly>
                    </p>
                  </div>
                  <Button
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
      </div>
      <footer className="muted-footer" role="status">
        {!isPending &&
          !isError &&
          m.muted_manager_results({
            shown: items.length,
            total: data?.length ?? 0,
          })}
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
        <UserRound size={22} />
      )}
    </span>
  );
}
