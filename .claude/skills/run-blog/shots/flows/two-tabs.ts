import type { Flow } from "./context.ts";
import { accountLabel, logOut, settle } from "./helpers.ts";

export const twoTabs: Flow = {
  name: "two-tabs",
  summary:
    "two tabs of one browser: signing out in one is reflected in the other, which never gets focus",
  // A logout ends the session; the runner puts it back from the database.
  needs: ["cookie", "local-db"],
  async run(ctx) {
    const first = await ctx.open({ signedIn: true });
    const second = await first.sibling();
    await first.page.goto(ctx.url("/"), { waitUntil: "load" });
    await second.page.goto(ctx.url("/posts"), { waitUntil: "load" });
    await settle(first.page, 2000);
    await settle(second.page, 1000);
    // The first tab is the one in front, the second stays in the background.
    await first.page.bringToFront();
    const before = await accountLabel(second.page);

    await logOut(first.page);
    const toasts = await first.waitForToast(10000);
    const label = await accountLabel(first.page);
    const reflected = await second.page
      .waitForFunction(
        ([selector, was]) =>
          document.querySelector(selector!)?.getAttribute("aria-label") !== was,
        [".public-account-trigger, .immersive-account", before] as const,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false);
    const after = await accountLabel(second.page);
    ctx.observe(
      "logoutToastInFirst",
      toasts.join(" | ").slice(0, 60) || "none",
    );
    ctx.observe("firstTabSignedOut", label !== before);
    ctx.observe("secondTabSignedOut", reflected);
    ctx.check(toasts.length > 0, "no toast after logging out in the first tab");
    ctx.check(label !== before, "the first tab still shows the account");
    ctx.check(
      reflected,
      `the other tab still reads "${after}" ten seconds later`,
    );
  },
};
