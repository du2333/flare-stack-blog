import { describe, expect, it } from "vitest";
import { sectionFirstPageFromPath } from "./settings-pages";

describe("sectionFirstPageFromPath", () => {
  it.each([
    ["/admin/settings", "/admin/settings/site"],
    ["/admin/settings/", "/admin/settings/site"],
    ["/admin/access", "/admin/access/api-keys"],
    ["/admin/access/", "/admin/access/api-keys"],
  ])("leads %s to the section's first tab", (pathname, to) => {
    expect(sectionFirstPageFromPath(pathname)).toBe(to);
  });

  it.each([
    "/admin",
    "/admin/settings/site",
    "/admin/settings/maintenance",
    "/admin/access/agent-skill",
    "/admin/settings-old",
    "/settings",
  ])("leaves %s where it is", (pathname) => {
    expect(sectionFirstPageFromPath(pathname)).toBeNull();
  });
});
