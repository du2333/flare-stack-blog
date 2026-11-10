import { ClientOnly } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, Globe } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { useContentMotion } from "@/hooks/use-motion";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { m } from "@/paraglide/messages";
import { FriendLinkManagerSkeleton } from "./friend-link-manager-skeleton";

type Link = FriendLinkWithUser;
function Logo({ link }: { link: Link }) {
  const [failed, setFailed] = useState(false);
  const logoUrl = link.logoUrl || link.user?.image;
  useEffect(() => setFailed(false), [logoUrl]);
  return (
    <span className="friend-logo">
      {logoUrl && !failed ? (
        <img src={logoUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <Globe aria-hidden="true" />
      )}
    </span>
  );
}
function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function FriendLinkReview({
  items,
  busy,
  loading,
  error,
  emptyCopy,
  search,
  onSearchChange,
  page,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  pagination,
}: {
  items: Link[];
  busy: boolean;
  loading: boolean;
  error: boolean;
  emptyCopy: string;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  onApprove: (link: Link) => void;
  onReject: (link: Link) => void;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
  pagination: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [input, setInput] = useState(search);
  const searchCallback = useRef(onSearchChange);
  searchCallback.current = onSearchChange;
  useEffect(() => setInput(search), [search]);
  useEffect(() => {
    if (input === search) return;
    const timer = window.setTimeout(() => searchCallback.current(input), 300);
    return () => window.clearTimeout(timer);
  }, [input, search]);
  const lastIndex = useRef(0);
  const selected =
    items.find((item) => item.id === selectedId) ??
    items[Math.min(lastIndex.current, items.length - 1)];
  const index = selected
    ? items.findIndex((item) => item.id === selected.id)
    : -1;
  const detailRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  useContentMotion(detailRef, `${selected?.id}:${detailOpen}:${loading}`);
  useContentMotion(queueRef, `${page}:${search}:${loading}`);
  useEffect(() => {
    lastIndex.current = 0;
    setSelectedId(null);
    setDetailOpen(false);
    queueRef.current?.scrollTo({ top: 0 });
  }, [page, search]);
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);
  useEffect(() => {
    if (detailOpen) backRef.current?.focus();
  }, [detailOpen]);
  const choose = (item: Link) => {
    lastIndex.current = items.findIndex(
      (candidate) => candidate.id === item.id,
    );
    setSelectedId(item.id);
    setDetailOpen(true);
  };
  const back = () => {
    setDetailOpen(false);
    requestAnimationFrame(() =>
      queueRef.current
        ?.querySelector<HTMLButtonElement>('[aria-current="true"]')
        ?.focus(),
    );
  };
  return (
    <>
      <div
        className="friend-body admin-frame-bleed"
        data-detail={detailOpen && !!selected}
      >
        <aside className="friend-queue" aria-label={m.friend_review_queue()}>
          <SearchField
            className="friend-search"
            value={input}
            onValueChange={setInput}
            clearLabel={m.search_clear()}
            maxLength={200}
            placeholder={m.friend_review_search()}
            aria-label={m.friend_review_search()}
          />
          <div
            className="friend-queue-scroll"
            ref={queueRef}
            aria-busy={loading}
          >
            {error ? (
              <EmptyState
                size="compact"
                role="alert"
                description={m.friend_links_admin_load_fail()}
              />
            ) : loading ? (
              <FriendLinkManagerSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                size="compact"
                description={search ? m.friend_review_no_results() : emptyCopy}
              />
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="friend-queue-item"
                  aria-current={selected?.id === item.id ? "true" : undefined}
                  onClick={() => choose(item)}
                >
                  <Logo link={item} />
                  <span className="friend-queue-copy">
                    <strong>{item.siteName}</strong>
                    <span>{host(item.siteUrl)}</span>
                    <small>
                      <ClientOnly fallback="—">
                        {formatDate(item.createdAt)}
                      </ClientOnly>
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
        <section
          className="friend-detail"
          aria-label={m.friend_review_details()}
        >
          {selected && !loading && !error ? (
            <>
              <button
                className="friend-mobile-back"
                type="button"
                ref={backRef}
                onClick={back}
              >
                <ArrowLeft size={18} />
                {m.friend_review_queue()}
              </button>
              <div className="friend-detail-scroll" ref={detailRef}>
                <div className="friend-site-heading">
                  <Logo link={selected} />
                  <div>
                    <h2>{selected.siteName}</h2>
                    <a
                      href={selected.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {host(selected.siteUrl)} <ExternalLink size={16} />{" "}
                      <span>{m.friend_review_visit()}</span>
                    </a>
                  </div>
                </div>
                <section className="friend-section">
                  <h3>{m.friend_review_applicant()}</h3>
                  <p>
                    {selected.user?.name || m.friend_links_admin_added()}{" "}
                    <span className="friend-muted">
                      {" "}
                      ·{" "}
                      <ClientOnly fallback="—">
                        {formatDate(selected.createdAt)}
                      </ClientOnly>
                    </span>
                  </p>
                </section>
                <section className="friend-section">
                  <h3>{m.friend_links_field_desc()}</h3>
                  <p>
                    {selected.description || m.friend_review_no_description()}
                  </p>
                </section>
                {selected.status === "rejected" && selected.rejectionReason && (
                  <section className="friend-section">
                    <h3>{m.friend_links_reject_reason()}</h3>
                    <p>{selected.rejectionReason}</p>
                  </section>
                )}
                <section className="friend-section">
                  <h3>{m.friend_review_preview()}</h3>
                  <p className="friend-muted">
                    {m.friend_review_preview_hint()}
                  </p>
                  <div className="friend-preview">
                    <Logo link={selected} />
                    <div>
                      <strong>{selected.siteName}</strong>
                      <p>
                        {selected.description ||
                          m.friend_review_no_description()}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <footer className="friend-actions">
                <div className="friend-step">
                  <IconButton
                    size="md"
                    label={m.friend_review_previous()}
                    disabled={index <= 0 || busy}
                    onClick={() => choose(items[index - 1])}
                  >
                    <ArrowLeft size={18} />
                  </IconButton>
                  <span>
                    {index + 1} / {items.length}
                  </span>
                  <IconButton
                    size="md"
                    label={m.friend_review_next()}
                    disabled={index >= items.length - 1 || busy}
                    onClick={() => choose(items[index + 1])}
                  >
                    <ArrowRight size={18} />
                  </IconButton>
                </div>
                <div className="friend-decisions">
                  {selected.status !== "pending" && (
                    <Button
                      variant="plain"
                      tone="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => onDelete(selected)}
                    >
                      {m.friend_links_action_delete()}
                    </Button>
                  )}
                  {selected.status !== "rejected" && (
                    <Button disabled={busy} onClick={() => onReject(selected)}>
                      {selected.status === "approved"
                        ? m.friend_links_action_remove()
                        : m.friend_links_action_reject()}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      selected.status === "approved"
                        ? onEdit(selected)
                        : onApprove(selected)
                    }
                  >
                    {selected.status === "approved"
                      ? m.friend_links_action_edit()
                      : m.friend_links_action_pass()}
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="friend-detail-placeholder">
              {loading ? (
                <FriendLinkManagerSkeleton />
              ) : (
                <>
                  <Globe size={36} />
                  <p>
                    {error
                      ? m.friend_links_admin_load_fail()
                      : search
                        ? m.friend_review_no_results()
                        : emptyCopy}
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="friend-pagination admin-frame-bleed">{pagination}</div>
    </>
  );
}
