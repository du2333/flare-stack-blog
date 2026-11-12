import { Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Menu, MenuItem } from "@/components/ui/menu";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import {
  pendingTiles,
  type NoticeTarget,
  type PendingTile,
  type SettingsNotice,
} from "@/features/dashboard/pending-tiles";
import { m } from "@/paraglide/messages";
import { formatCount } from "./format";

function TileBody({ tile }: { tile: PendingTile }) {
  const quiet = tile.count === 0;
  return (
    <>
      <span className="glance-tile-number">{formatCount(tile.count)}</span>
      <span className="glance-tile-name">{tile.label}</span>
      <span className="glance-tile-line">
        {quiet ? m.dashboard_tile_none() : tile.latest}
      </span>
    </>
  );
}

function NoticeLink({
  target,
  className,
  children,
}: {
  target: NoticeTarget;
  className: string;
  children: ReactNode;
}) {
  if (target.kind === "external")
    return (
      <a
        href={target.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  return (
    <Link from="/" to={target.to} className={className}>
      {children}
    </Link>
  );
}

/**
 * One notice: the tile links to where it is fixed. Several: the tile opens a
 * menu that lists every notice with what it means, each item going to its fix.
 */
function NoticesTile({
  tile,
}: {
  tile: Extract<PendingTile, { key: "notices" }>;
}) {
  const navigate = useNavigate();
  const { notices } = tile;
  const [only] = notices;
  const body = <TileBody tile={tile} />;
  if (notices.length === 1 && only)
    return (
      <NoticeLink target={only.target} className="glance-tile">
        {body}
      </NoticeLink>
    );

  const open = (notice: SettingsNotice) => {
    if (notice.target.kind === "external")
      window.open(notice.target.href, "_blank", "noopener,noreferrer");
    else void navigate({ to: notice.target.to });
  };
  return (
    <Menu
      label={tile.label}
      trigger={body}
      triggerClassName="glance-tile"
    >
      {notices.map((notice) => (
        <MenuItem key={notice.key} onSelect={() => open(notice)}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-(--fuwari-fg)">
              {notice.title}
            </span>
            <span className="text-xs fuwari-text-50">{notice.description}</span>
          </span>
          {notice.target.kind === "external" ? (
            <ExternalLink size={14} aria-hidden className="shrink-0" />
          ) : null}
        </MenuItem>
      ))}
    </Menu>
  );
}

function Tile({ tile }: { tile: PendingTile }) {
  const className = "glance-tile";
  const quiet = tile.count === 0;
  const body = <TileBody tile={tile} />;
  const data = { "data-quiet": quiet ? "" : undefined };
  switch (tile.key) {
    case "comments":
      return (
        <Link
          to="/admin/comments"
          search={{ view: "unreplied" }}
          className={className}
          {...data}
        >
          {body}
        </Link>
      );
    case "friendLinks":
      return (
        <Link
          to="/admin/friend-links"
          search={{ status: "pending", page: 1 }}
          className={className}
          {...data}
        >
          {body}
        </Link>
      );
    case "drafts":
      return (
        <Link
          to="/admin/posts"
          search={{ status: "DRAFT" }}
          className={className}
          {...data}
        >
          {body}
        </Link>
      );
    case "notices":
      return <NoticesTile tile={tile} />;
    default:
      tile satisfies never;
      return null;
  }
}

/**
 * What waits on the Admin, in one row of equal tiles: a number, the name and
 * the most recent item. The whole tile is the link. A tile at zero is quiet
 * but still a link; the settings tile exists only while there is a notice,
 * and opens a menu when there are several.
 */
export function DashboardTiles({ data }: { data: DashboardOverview }) {
  const tiles = pendingTiles(data);
  return (
    <ul
      className="glance-tiles"
      style={{ "--glance-tiles": tiles.length } as object}
      aria-label={m.dashboard_tiles_label()}
    >
      {tiles.map((tile) => (
        <li key={tile.key}>
          <Tile tile={tile} />
        </li>
      ))}
    </ul>
  );
}
