import type { Flow } from "./context.ts";
import { settle, statusPageTitle } from "./helpers.ts";

/**
 * `/admin` and the Admin's main pages, by the paths they are shown at (the
 * redirecting `/admin/access` and `/admin/settings` are not among them); a
 * path that redirects must end under /admin.
 */
const PAGES = [
  "/admin",
  "/admin/posts",
  "/admin/media",
  "/admin/comments",
  "/admin/friend-links",
  "/admin/taxonomy",
  "/admin/personalize",
  "/admin/settings/site",
  "/admin/settings/notifications",
  "/admin/settings/maintenance",
  "/admin/access/api-keys",
  "/admin/access/agent-skill",
  "/admin/muted-users",
];

/** Pages that manage API Keys: an API Key cannot, and they answer it 403. */
const COOKIE_ONLY = ["/admin/access/api-keys", "/admin/access/agent-skill"];

export const adminPages: Flow = {
  name: "admin-pages",
  summary:
    "/admin and each main Admin page renders without an error page; creating and deleting a tag shows both toasts",
  needs: ["session"],
  async run(ctx) {
    const tab = await ctx.open({ signedIn: true });
    const { page } = tab;

    const pages = PAGES.filter(
      (path) => ctx.hasCookie || !COOKIE_ONLY.includes(path),
    );
    let rendered = 0;
    for (const path of pages) {
      const response = await page.goto(ctx.url(path), { waitUntil: "load" });
      await settle(page, 1500);
      const title = await statusPageTitle(page);
      const where = new URL(page.url()).pathname;
      const text = (await page.locator("body").innerText()).trim().length;
      const problem =
        (response?.status() ?? 0) >= 400
          ? `HTTP ${response?.status()}`
          : title !== undefined
            ? `error page "${title}"`
            : !where.startsWith("/admin")
              ? `redirected to ${where}`
              : text < 20
                ? "blank"
                : undefined;
      if (problem) ctx.check(false, `${path}: ${problem}`);
      else rendered++;
    }
    ctx.observe("pagesRendered", `${rendered}/${pages.length}`);

    const name = `flows-${Date.now() % 100000}`;
    await page.goto(ctx.url("/admin/taxonomy"), { waitUntil: "load" });
    await settle(page, 1500);
    await page
      .locator("section.taxonomy-column[aria-label=标签]")
      .getByRole("button", { name: "新建" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").fill(name);
    await dialog
      .getByRole("button", { name: /保存|创建|确认|新建/ })
      .last()
      .click();
    const created = await tab.waitForToast(10000);
    ctx.observe("tagCreateToast", created.join(" | ").slice(0, 60) || "none");
    ctx.check(created.length > 0, "no toast after creating a tag");

    await page
      .waitForFunction(
        () => !document.querySelector("[data-sonner-toast]"),
        undefined,
        {
          timeout: 15000,
        },
      )
      .catch(() => {});
    await page.getByRole("button", { name: `「${name}」的操作` }).click();
    await page.getByRole("menuitem", { name: "删除" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /删除|确认/ })
      .last()
      .click();
    const deleted = await tab.waitForToast(10000);
    ctx.observe("tagDeleteToast", deleted.join(" | ").slice(0, 60) || "none");
    ctx.check(deleted.length > 0, "no toast after deleting the tag");
    ctx.check(
      deleted.join(" ") !== created.join(" "),
      "the delete toast is the create toast still on screen",
    );
  },
};
