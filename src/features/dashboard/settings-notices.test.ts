import { expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { settingsNotices } from "./settings-notices";

const QUIET = {
  popularityAlert: null,
  adminEmailNeedsSetup: false,
  defaultSiteIdentity: false,
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

it("orders the notices: the email, the popularity, the site identity", () => {
  const notices = settingsNotices({
    popularityAlert: "failed",
    adminEmailNeedsSetup: true,
    defaultSiteIdentity: true,
  });
  expect(notices.map((notice) => notice.key)).toEqual([
    "email",
    "popularity-failed",
    "identity",
  ]);
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
