import type { Flow } from "./context.ts";
import { logOut, readAccountMenu, settle } from "./helpers.ts";

export const accountAndLogout: Flow = {
  name: "account-and-logout",
  summary:
    "signed in, the public navigation shows the account and the Admin entry; logging out shows its toast and ends the session",
  needs: ["session"],
  async run(ctx) {
    const tab = await ctx.open({ signedIn: true });
    const { page } = tab;
    await page.goto(ctx.url("/"), { waitUntil: "load" });
    await settle(page, 2000);
    const menu = await readAccountMenu(page);
    ctx.observe("accountShown", menu.identity !== "" && !menu.loginEntry);
    ctx.observe("adminEntry", menu.adminEntry);
    ctx.check(
      menu.identity !== "" && !menu.loginEntry,
      "the menu shows no account",
    );
    ctx.check(menu.adminEntry, "the menu has no Admin entry");

    // An API key is a session by header: signing out cannot end it. A logout
    // on a site where the cookie cannot be put back would end the user's own.
    if (!ctx.hasCookie || !ctx.db) {
      ctx.observe("logout", "skipped (needs --session on a local dev server)");
      return;
    }
    await logOut(page);
    const toasts = await tab.waitForToast(10000);
    await settle(page, 1000);
    const after = await readAccountMenu(page);
    const server = await page.evaluate(() =>
      fetch("/api/auth/get-session").then((response) => response.text()),
    );
    ctx.observe("logoutToast", toasts.join(" | ").slice(0, 60) || "none");
    ctx.observe(
      "signedOutInNavigation",
      after.loginEntry && after.identity === "",
    );
    ctx.observe(
      "serverSession",
      server.trim() === "null" ? "gone" : "still there",
    );
    ctx.check(toasts.length > 0, "no toast after logging out");
    ctx.check(after.loginEntry, "the navigation still shows the account");
    ctx.check(server.trim() === "null", "the server still has the session");
  },
};
