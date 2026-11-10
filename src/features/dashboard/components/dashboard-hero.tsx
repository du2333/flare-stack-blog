import { Link, useRouteContext } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { m } from "@/paraglide/messages";
import { formatToday } from "./format";

const DRAFT_TITLE_MAX = 18;

function greeting(name: string, hour: number) {
  if (hour >= 5 && hour < 12) return m.dashboard_greeting_morning({ name });
  if (hour >= 12 && hour < 18) return m.dashboard_greeting_afternoon({ name });
  return m.dashboard_greeting_evening({ name });
}

/** One sentence of what is going on: traffic, then what waits on the Admin. */
function summary({
  popularity,
  unrepliedTotal,
  pendingFriendLinks,
}: {
  popularity: DashboardOverview["popularity"];
  unrepliedTotal: number;
  pendingFriendLinks: number;
}) {
  const parts: Array<string> = [];
  const hasViews =
    popularity.state === "ready" || popularity.state === "expired";
  if (hasViews && popularity.totalViews > 0)
    parts.push(m.dashboard_summary_views({ count: popularity.totalViews }));
  if (unrepliedTotal > 0)
    parts.push(m.dashboard_summary_unreplied({ count: unrepliedTotal }));
  if (pendingFriendLinks > 0)
    parts.push(
      m.dashboard_summary_pending_links({ count: pendingFriendLinks }),
    );
  if (parts.length === 0) return m.dashboard_summary_clear();
  return parts.join(" · ");
}

function shorten(title: string) {
  const characters = Array.from(title);
  if (characters.length <= DRAFT_TITLE_MAX) return title;
  return `${characters.slice(0, DRAFT_TITLE_MAX - 1).join("")}…`;
}

/**
 * The page's one emphasised surface: the site's own banner behind a
 * greeting, a sentence about the blog, and what to write next.
 */
export function DashboardHero({
  popularity,
  unrepliedTotal,
  pendingFriendLinks,
  latestDraft,
  onCreate,
  isCreating,
  createLabel,
}: {
  popularity: DashboardOverview["popularity"];
  unrepliedTotal: number;
  pendingFriendLinks: number;
  latestDraft: DashboardOverview["latestDraft"];
  onCreate: () => void;
  isCreating: boolean;
  createLabel: string;
}) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { session } = useRouteContext({ from: "/admin" });
  const [imageFailed, setImageFailed] = useState(false);
  const banner = siteConfig.bannerImage;
  const image =
    banner && !imageFailed
      ? getPublicImageSrc(banner, PUBLIC_IMAGE_WIDTH.banner)
      : null;
  const now = new Date();
  const draftTitle = latestDraft
    ? latestDraft.title.trim() || m.common_untitled()
    : null;

  return (
    <header className="dashboard-hero" data-image={image ? "" : undefined}>
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="dashboard-hero-image"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      <div className="dashboard-hero-content">
        <h1 className="sr-only">{m.admin_overview_title()}</h1>
        <p className="dashboard-hero-date">{formatToday(now)}</p>
        <p className="dashboard-hero-greeting">
          {greeting(session.user.name, now.getHours())}
        </p>
        <p className="dashboard-hero-summary">
          {summary({ popularity, unrepliedTotal, pendingFriendLinks })}
        </p>
        <div className="dashboard-hero-actions">
          {latestDraft && draftTitle ? (
            <Link
              to="/admin/posts/edit/$id"
              params={{ id: String(latestDraft.id) }}
              title={draftTitle}
              className={buttonClass({ variant: "primary" })}
            >
              {m.dashboard_hero_continue({ title: shorten(draftTitle) })}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : null}
          <span
            className="dashboard-hero-create"
            data-alone={latestDraft ? undefined : ""}
          >
            <Button
              variant={latestDraft ? "regular" : "primary"}
              onClick={onCreate}
              loading={isCreating}
              icon={<Plus size={18} />}
            >
              {createLabel}
            </Button>
          </span>
        </div>
      </div>
    </header>
  );
}
