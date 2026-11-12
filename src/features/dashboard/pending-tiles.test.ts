import { expect, it } from "vitest";
import type { DashboardOverview } from "@/features/dashboard/dashboard.schema";
import { m } from "@/paraglide/messages";
import { pendingTiles, settingsNotices } from "./pending-tiles";

const NEW_SITE: DashboardOverview = {
  popularityAlert: null,
  adminEmailNeedsSetup: false,
  defaultSiteIdentity: false,
  update: null,
  stats: {
    publishedPosts: 0,
    draftPosts: 0,
    comments: 0,
    recentComments: 0,
    approvedFriendLinks: 0,
    pendingFriendLinks: 0,
  },
  popularity: {
    state: "unconfigured",
    windowStart: null,
    windowEnd: null,
    totalViews: 0,
    topPosts: [],
  },
  writingActivity: [],
  latestDraft: null,
  recentPosts: [],
  pendingFriendLinks: { items: [], remainingCount: 0 },
  unrepliedComments: { items: [], total: 0 },
};

const comment = (
  over: Partial<DashboardOverview["unrepliedComments"]["items"][number]>,
) => ({
  id: 1,
  postId: 1,
  momentId: null,
  rootId: null,
  userId: "u1",
  userName: "Ada",
  userImage: null,
  userMuted: false,
  postTitle: "Post",
  postSlug: "post",
  momentTitle: null,
  commentPath: "/post/post#comment-1",
  snippet: "Nice read",
  createdAt: new Date(),
  ...over,
});

it("returns the three tiles at zero for a brand-new site, with no settings tile", () => {
  const tiles = pendingTiles(NEW_SITE);
  expect(tiles.map((tile) => [tile.key, tile.count, tile.latest])).toEqual([
    ["comments", 0, null],
    ["friendLinks", 0, null],
    ["drafts", 0, null],
  ]);
});

it("summarises each tile with its most recent item", () => {
  const tiles = pendingTiles({
    ...NEW_SITE,
    stats: { ...NEW_SITE.stats, draftPosts: 2, pendingFriendLinks: 3 },
    unrepliedComments: { items: [comment({})], total: 12 },
    pendingFriendLinks: {
      items: [
        {
          id: 1,
          siteName: "Sure Blog",
          siteUrl: "https://sure.example",
          logoUrl: null,
          createdAt: new Date(),
        },
      ],
      remainingCount: 2,
    },
    latestDraft: {
      id: 5,
      title: "  ",
      status: "draft",
      pinnedAt: null,
      updatedAt: new Date(),
      hasUnpublishedChanges: false,
    },
  });
  expect(tiles.map((tile) => [tile.key, tile.count, tile.latest])).toEqual([
    [
      "comments",
      12,
      m.dashboard_tile_comment_line({ name: "Ada", snippet: "Nice read" }),
    ],
    ["friendLinks", 3, "Sure Blog"],
    ["drafts", 2, m.common_untitled()],
  ]);
});

it("names a commenter without a snippet or a name", () => {
  const [tile] = pendingTiles({
    ...NEW_SITE,
    unrepliedComments: {
      items: [comment({ snippet: "", userName: null })],
      total: 1,
    },
  });
  expect(tile?.latest).toBe(m.admin_overview_activity_anonymous());
});

it("adds a settings tile with the notice count, the first notice and every notice behind it", () => {
  const data = {
    ...NEW_SITE,
    adminEmailNeedsSetup: true,
    defaultSiteIdentity: true,
  };
  const tiles = pendingTiles(data);
  const tile = tiles[3];
  expect(tile).toMatchObject({
    key: "notices",
    count: 2,
    latest: m.admin_overview_email_needs_setup(),
  });
  expect(
    tile?.key === "notices" &&
      tile.notices.map((notice) => [
        notice.title,
        notice.description,
        notice.target,
      ]),
  ).toEqual([
    [
      m.admin_overview_email_needs_setup(),
      m.admin_overview_email_needs_setup_desc(),
      { kind: "settings", to: "/admin/settings/notifications" },
    ],
    [
      m.admin_overview_default_site_identity(),
      m.admin_overview_default_site_identity_desc(),
      { kind: "settings", to: "/admin/settings/site" },
    ],
  ]);
});

it("explains the new version with the running one", () => {
  const [notice] = settingsNotices({
    ...NEW_SITE,
    update: { latestVersion: "9.9.9", releaseUrl: "https://example.com/r" },
  });
  expect(notice?.description).toBe(
    m.admin_overview_update_available_desc({ current: __APP_VERSION__ }),
  );
  expect(notice?.description).toContain(__APP_VERSION__);
});

it("orders the notices: a failed sync first, an update last", () => {
  const notices = settingsNotices({
    popularityAlert: "failed",
    adminEmailNeedsSetup: true,
    defaultSiteIdentity: true,
    update: { latestVersion: "9.9.9", releaseUrl: "https://example.com/r" },
  });
  expect(notices.map((notice) => notice.key)).toEqual([
    "popularity-failed",
    "email",
    "identity",
    "update",
  ]);
  expect(notices[3]?.target).toEqual({
    kind: "external",
    href: "https://example.com/r",
  });
});

it("leaves an expired snapshot out: it is synced from the popular list", () => {
  expect(
    settingsNotices({
      popularityAlert: "expired",
      adminEmailNeedsSetup: false,
      defaultSiteIdentity: false,
      update: null,
    }),
  ).toEqual([]);
});
