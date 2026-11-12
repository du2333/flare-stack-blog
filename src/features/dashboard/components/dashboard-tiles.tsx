import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import {
  pendingTiles,
  type NoticeTarget,
  type PendingTile,
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
  quiet,
  children,
}: {
  target: NoticeTarget;
  className: string;
  quiet: boolean;
  children: ReactNode;
}) {
  const data = { "data-quiet": quiet ? "" : undefined };
  if (target.kind === "external")
    return (
      <a
        href={target.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...data}
      >
        {children}
      </a>
    );
  return (
    <Link from="/" to={target.to} className={className} {...data}>
      {children}
    </Link>
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
      return (
        <NoticeLink target={tile.target} className={className} quiet={quiet}>
          {body}
        </NoticeLink>
      );
    default:
      tile satisfies never;
      return null;
  }
}

/**
 * What waits on the Admin, in one row of equal tiles: a number, the name and
 * the most recent item. The whole tile is the link. A tile at zero is quiet
 * but still a link; the settings tile exists only while there is a notice.
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
