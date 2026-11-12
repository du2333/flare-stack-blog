import { expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { settingsNotices } from "./settings-notices";

const QUIET = {
  popularityAlert: null,
  adminEmailNeedsSetup: false,
  defaultSiteIdentity: false,
  update: null,
} as const;

it("has nothing to say about a site whose settings are in order", () => {
  expect(settingsNotices(QUIET)).toEqual([]);
});

it("sends each settings notice to where it is fixed", () => {
  const notices = settingsNotices({
    ...QUIET,
    adminEmailNeedsSetup: true,
    defaultSiteIdentity: true,
  });
  expect(
    notices.map((notice) => [notice.title, notice.description, notice.target]),
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
    ...QUIET,
    update: { latestVersion: "9.9.9", releaseUrl: "https://example.com/r" },
  });
  expect(notice?.description).toBe(
    m.admin_overview_update_available_desc({ current: __APP_VERSION__ }),
  );
  expect(notice?.description).toContain(__APP_VERSION__);
});

it("orders the notices: a new release, the email, the popularity, the site identity", () => {
  const notices = settingsNotices({
    popularityAlert: "failed",
    adminEmailNeedsSetup: true,
    defaultSiteIdentity: true,
    update: { latestVersion: "9.9.9", releaseUrl: "https://example.com/r" },
  });
  expect(notices.map((notice) => notice.key)).toEqual([
    "update",
    "email",
    "popularity-failed",
    "identity",
  ]);
  expect(notices[0]?.target).toEqual({
    kind: "external",
    href: "https://example.com/r",
  });
});

it("sends an expired snapshot to the maintenance page, where it is synced", () => {
  expect(
    settingsNotices({ ...QUIET, popularityAlert: "expired" }).map((notice) => [
      notice.key,
      notice.title,
      notice.target,
    ]),
  ).toEqual([
    [
      "popularity-expired",
      m.admin_overview_popularity_expired(),
      { kind: "settings", to: "/admin/settings/maintenance" },
    ],
  ]);
});
