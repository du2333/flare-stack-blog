import type { Page } from "playwright-core";
import type { Flow } from "./context.ts";
import { settle } from "./helpers.ts";
import { THROWAWAY_ADMIN_ID } from "./local-db.ts";

export const nameGate: Flow = {
  name: "name-gate",
  summary:
    "the name gate opens for a signed-in user whose name is empty and closes after a save (the name is blanked in the local database and always put back)",
  needs: ["session", "local-db"],
  async run(ctx) {
    const db = ctx.db!;
    const row = db.get<{ name: string }>(
      "select name from user where id = ?",
      THROWAWAY_ADMIN_ID,
    );
    // A run that was killed while the name was blank leaves it blank.
    const original = row?.name?.trim() ? row.name : "Dev Admin Session";
    const gate = (page: Page) => page.locator(".name-gate:visible").count();

    try {
      db.run("update user set name = '' where id = ?", THROWAWAY_ADMIN_ID);
      const tab = await ctx.open({ signedIn: true });
      await tab.page.goto(ctx.url("/"), { waitUntil: "load" });
      await settle(tab.page, 2000);
      const opened = await gate(tab.page);
      ctx.observe("gateOpensForEmptyName", opened > 0);
      ctx.check(opened > 0, "the gate did not open for an empty name");
      if (!opened) return;

      await tab.page.locator(".name-gate input").fill("Reader");
      await tab.page.locator(".name-gate button[type=submit]").click();
      await tab.page
        .locator(".name-gate")
        .first()
        .waitFor({ state: "hidden", timeout: 15000 })
        .catch(() => {});
      const closed = (await gate(tab.page)) === 0;
      const saved = db.get<{ name: string }>(
        "select name from user where id = ?",
        THROWAWAY_ADMIN_ID,
      );
      ctx.observe("gateClosesAfterSave", closed);
      ctx.observe("nameSaved", saved?.name === "Reader");
      ctx.check(closed, "the gate stayed open after saving a name");
      ctx.check(saved?.name === "Reader", `the name saved is "${saved?.name}"`);
    } finally {
      db.run(
        "update user set name = ? where id = ?",
        original,
        THROWAWAY_ADMIN_ID,
      );
    }
  },
};
