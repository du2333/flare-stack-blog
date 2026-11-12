import { ClientOnly } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Link2,
  SearchX,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AdminSplit } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PickRow } from "@/components/ui/pick-row";
import { Skeleton } from "@/components/ui/skeleton";
import type { FriendLinkWithUser } from "@/features/friend-links/friend-links.schema";
import { useContentMotion, useMediaQuery } from "@/hooks/use-motion";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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

/** Where the queue and the detail take turns (admin-page.css). */
const STACKED_QUERY = "(max-width: 767px)";

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Typing, or a popup is open: J and K stay out. */
function keysBlocked(target: EventTarget | null) {
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.matches("input, textarea, select, [role='tab']"))
  )
    return true;
  return Boolean(
    document.querySelector(
      "[role='dialog'], [role='alertdialog'], [role='menu']",
    ),
  );
}

/**
 * The Friend Links of one status as a queue and the chosen one beside it:
 * the site, who asked and when, how it shows on the public page, and the
 * decision at the foot. J and K move through the queue.
 */
export function FriendLinkReview({
  items,
  busy,
  loading,
  error,
  emptyCopy,
  search,
  onClearSearch,
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
  onClearSearch: () => void;
  page: number;
  onApprove: (link: Link) => void;
  onReject: (link: Link) => void;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
  /** Under the queue: its pages. */
  pagination: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const lastIndex = useRef(0);
  const selected =
    items.find((item) => item.id === selectedId) ??
    items[Math.min(lastIndex.current, items.length - 1)];
  const index = selected ? items.indexOf(selected) : -1;
  const stacked = useMediaQuery(STACKED_QUERY);
  // Stacked and still on the queue: nothing is chosen yet, so nothing is lit.
  const highlighted = selected && !(stacked && !detailOpen) ? selected : null;
  const detailRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  useContentMotion(detailRef, String(selected?.id));
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
    if (detailOpen && stacked) backRef.current?.focus();
  }, [detailOpen, stacked]);
  // The chosen row stays in sight as the keys move through the queue.
  useLayoutEffect(() => {
    const scroller = queueRef.current;
    const row = scroller?.querySelector("[aria-current='true']");
    if (!scroller || !row) return;
    const box = scroller.getBoundingClientRect();
    const rect = row.getBoundingClientRect();
    if (rect.top < box.top + 8) scroller.scrollTop -= box.top + 8 - rect.top;
    else if (rect.bottom > box.bottom - 8)
      scroller.scrollTop += rect.bottom - box.bottom + 8;
  }, [highlighted?.id]);

  const choose = (item: Link, open = true) => {
    lastIndex.current = items.indexOf(item);
    setSelectedId(item.id);
    if (open) setDetailOpen(true);
  };
  const step = (delta: number) => {
    const next = items[index + delta];
    if (next && !busy) choose(next, false);
  };
  const keys = useRef<(event: KeyboardEvent) => void>(() => {});
  keys.current = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (keysBlocked(event.target)) return;
    const inQueue =
      event.target instanceof Node && queueRef.current?.contains(event.target);
    const key = event.key.toLowerCase();
    if (key === "j" || (inQueue && key === "arrowdown")) step(1);
    else if (key === "k" || (inQueue && key === "arrowup")) step(-1);
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keys.current(event);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (error)
    return (
      <EmptyState
        variant="tile"
        role="alert"
        icon={Link2}
        description={m.friend_links_admin_load_fail()}
      />
    );
  if (loading) return <FriendLinkReviewSkeleton />;
  if (items.length === 0)
    return search ? (
      <EmptyState
        variant="tile"
        icon={SearchX}
        description={m.friend_review_no_results()}
        action={
          <Button variant="outline" size="sm" onClick={onClearSearch}>
            {m.search_clear()}
          </Button>
        }
      />
    ) : (
      <EmptyState variant="tile" icon={Link2} description={emptyCopy} />
    );

  const previewHint = selected
    ? {
        pending: m.friend_review_preview_hint(),
        approved: m.friend_review_preview_hint_approved(),
        rejected: m.friend_review_preview_hint_rejected(),
      }[selected.status]
    : "";
  return (
    <AdminSplit
      className="friend-split"
      detailOpen={detailOpen && Boolean(selected)}
      listLabel={m.friend_review_queue()}
      detailLabel={m.friend_review_details()}
      list={
        <>
          <div className="friend-queue custom-scrollbar" ref={queueRef}>
            {items.map((item) => (
              <PickRow
                key={item.id}
                className="friend-row"
                chosen={selected?.id === item.id}
                current={highlighted?.id === item.id}
                onClick={() => choose(item)}
              >
                <Logo link={item} />
                <span className="friend-row-main">
                  <span className="friend-row-top">
                    <strong>{item.siteName}</strong>
                    <time dateTime={new Date(item.createdAt).toISOString()}>
                      <ClientOnly fallback="—">
                        {formatDate(item.createdAt)}
                      </ClientOnly>
                    </time>
                  </span>
                  <span className="friend-row-host">{host(item.siteUrl)}</span>
                  {item.description ? (
                    <span className="friend-row-text">{item.description}</span>
                  ) : null}
                </span>
              </PickRow>
            ))}
          </div>
          {pagination ? (
            <div className="friend-queue-foot">{pagination}</div>
          ) : null}
        </>
      }
      detail={
        selected ? (
          <>
            <header className="friend-detail-head">
              <IconButton
                ref={backRef}
                className="friend-back"
                variant="quiet"
                size="sm"
                label={m.friend_review_queue()}
                onClick={() => {
                  setDetailOpen(false);
                  requestAnimationFrame(() =>
                    queueRef.current
                      ?.querySelector<HTMLElement>("[data-chosen]")
                      ?.focus(),
                  );
                }}
              >
                <ArrowLeft size={17} />
              </IconButton>
              <span className="friend-position">
                {index + 1} / {items.length}
              </span>
              <IconButton
                variant="quiet"
                size="sm"
                label={`${m.friend_review_previous()} (K)`}
                disabled={index <= 0 || busy}
                onClick={() => step(-1)}
              >
                <ChevronUp size={17} />
              </IconButton>
              <IconButton
                variant="quiet"
                size="sm"
                label={`${m.friend_review_next()} (J)`}
                disabled={index >= items.length - 1 || busy}
                onClick={() => step(1)}
              >
                <ChevronDown size={17} />
              </IconButton>
            </header>
            <div
              className="friend-detail-scroll custom-scrollbar"
              ref={detailRef}
            >
              <div className="friend-site">
                <Logo link={selected} />
                <div>
                  <h2>{selected.siteName}</h2>
                  <a
                    href={selected.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${m.friend_review_visit()} ${host(selected.siteUrl)}`}
                  >
                    {host(selected.siteUrl)}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <dl className="friend-facts">
                <div>
                  <dt>{m.friend_review_applicant()}</dt>
                  <dd>{selected.user?.name || m.friend_links_admin_added()}</dd>
                </div>
                <div>
                  <dt>{m.friend_review_applied()}</dt>
                  <dd>
                    <ClientOnly fallback="—">
                      {formatDate(selected.createdAt)}
                    </ClientOnly>
                  </dd>
                </div>
                <div>
                  <dt>{m.friend_links_field_url()}</dt>
                  <dd>{selected.siteUrl}</dd>
                </div>
                <div>
                  <dt>{m.friend_links_field_desc()}</dt>
                  <dd data-empty={selected.description ? undefined : ""}>
                    {selected.description || m.friend_review_no_description()}
                  </dd>
                </div>
                {selected.status === "rejected" && selected.rejectionReason ? (
                  <div>
                    <dt>{m.friend_links_reject_reason()}</dt>
                    <dd>{selected.rejectionReason}</dd>
                  </div>
                ) : null}
              </dl>
              <section className="friend-stage">
                <h3>{m.friend_review_preview()}</h3>
                <p>{previewHint}</p>
                <div className="friend-preview">
                  <Logo link={selected} />
                  <div>
                    <strong>{selected.siteName}</strong>
                    <p>
                      {selected.description || m.friend_review_no_description()}
                    </p>
                  </div>
                </div>
              </section>
            </div>
            <footer className="friend-actions">
              {selected.status !== "pending" ? (
                <IconButton
                  variant="quiet"
                  size="md"
                  tone="danger"
                  label={m.friend_links_action_delete()}
                  disabled={busy}
                  onClick={() => onDelete(selected)}
                >
                  <Trash2 size={16} />
                </IconButton>
              ) : null}
              <div className="friend-decisions">
                {selected.status !== "rejected" ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => onReject(selected)}
                  >
                    {selected.status === "approved"
                      ? m.friend_links_action_remove()
                      : m.friend_links_action_reject()}
                  </Button>
                ) : null}
                <Button
                  variant="ink"
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
        ) : null
      }
    />
  );
}

/** The queue and a site at their sizes while the list loads. */
export function FriendLinkReviewSkeleton() {
  return (
    <div className="admin-split friend-split" aria-hidden="true">
      <div className="admin-split-list">
        <div className="friend-queue">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="friend-row">
              <Skeleton shimmer className="friend-logo" />
              <div className="friend-row-main">
                <Skeleton shimmer className="h-4 w-32 rounded" />
                <Skeleton shimmer className="mt-2 h-3 w-40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-split-detail">
        <div className="friend-detail-head" />
        <div className="friend-detail-scroll">
          <div className="friend-site">
            <Skeleton shimmer className="friend-logo" />
            <div>
              <Skeleton shimmer className="h-6 w-44 rounded" />
              <Skeleton shimmer className="mt-2 h-4 w-32 rounded" />
            </div>
          </div>
          <Skeleton shimmer className="mt-6 h-4 w-2/3 rounded" />
          <Skeleton shimmer className="mt-3 h-4 w-1/2 rounded" />
          <Skeleton shimmer className="mt-3 h-4 w-3/5 rounded" />
        </div>
      </div>
    </div>
  );
}
