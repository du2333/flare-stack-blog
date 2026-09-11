import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Select } from "@/components/ui/select";
import { useContentMotion } from "@/hooks/use-motion";
import { useMutedUsers } from "@/features/muted-users/hooks/use-muted-users";
import type { MutedUser } from "@/features/muted-users/muted-users.schema";
import { mutedUsersQuery } from "@/features/muted-users/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { MutedUsersListSkeleton } from "./muted-users-skeleton";
import "./muted-users.css";

export function MutedUsersPage() {
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
    <div className="muted-workspace fuwari-card-base">
      <header className="muted-heading">
        <div>
          <h1>{m.muted_users_title()}</h1>
          <p>{m.muted_manager_hint()}</p>
        </div>
        <span className="muted-count">
          {isPending || isError
            ? "—"
            : m.muted_manager_count({ count: data?.length ?? 0 })}
        </span>
      </header>
      <div className="muted-toolbar">
        <label className="muted-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={m.muted_manager_search()}
            aria-label={m.muted_manager_search()}
            maxLength={200}
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label={m.muted_manager_clear()}
            >
              <X size={16} />
            </button>
          )}
        </label>
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
            <div className="muted-empty" role="alert">
              <p>{m.muted_users_toast_error()}</p>
              <button
                type="button"
                className="muted-action fuwari-btn-regular"
                onClick={() => void refetch()}
              >
                {m.muted_manager_retry()}
              </button>
            </div>
          ) : isPending ? (
            <MutedUsersListSkeleton />
          ) : items.length === 0 ? (
            <div className="muted-empty">
              {data?.length ? (
                <Search size={32} aria-hidden="true" />
              ) : (
                <ShieldCheck size={36} aria-hidden="true" />
              )}
              <h2>
                {data?.length
                  ? m.muted_manager_no_results()
                  : m.muted_users_empty()}
              </h2>
              <p>
                {data?.length
                  ? m.muted_manager_search_hint()
                  : m.muted_manager_empty_hint()}
              </p>
              {search && (
                <button
                  type="button"
                  className="muted-action fuwari-btn-regular"
                  onClick={clearSearch}
                >
                  {m.muted_manager_clear()}
                </button>
              )}
            </div>
          ) : (
            <ul className="muted-list">
              {items.map((user) => (
                <li key={user.id} className="muted-row">
                  <Avatar image={user.image} />
                  <div className="muted-user">
                    <h2>{user.name}</h2>
                    <p>
                      <ClientOnly fallback="—">
                        {m.muted_users_muted_at({
                          date: formatDate(user.mutedAt, { includeTime: true }),
                        })}
                      </ClientOnly>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="muted-action fuwari-btn-regular"
                    disabled={isUnmuting}
                    onClick={() => setPending(user)}
                    aria-label={m.muted_manager_unmute_named({
                      name: user.name,
                    })}
                  >
                    {m.muted_users_unmute()}
                  </button>
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
