import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { Route } from "./index";

function redirectOf(search: Record<string, unknown>) {
  try {
    (Route.options.beforeLoad as (ctx: unknown) => void)({ search });
  } catch (thrown) {
    if (isRedirect(thrown)) return thrown;
    throw thrown;
  }
  throw new Error("beforeLoad did not redirect");
}

describe("/admin/settings", () => {
  it.each([{}, { tab: "api-keys" }, { tab: "unknown" }])(
    "redirects to the site page for search %j",
    (search) => {
      expect(redirectOf(search).options.to).toBe("/admin/settings/site");
    },
  );

  it("does not validate the search, so an old ?tab= never fails", () => {
    expect(Route.options.validateSearch).toBeUndefined();
  });
});
