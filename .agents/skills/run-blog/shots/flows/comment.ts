import type { Flow } from "./context.ts";
import { postPaths, settle } from "./helpers.ts";

export const comment: Flow = {
  name: "comment",
  summary:
    "signed in, a comment can be posted on a Post and appears (the flow deletes it again)",
  needs: ["session"],
  async run(ctx) {
    const tab = await ctx.open({ signedIn: true });
    const { page } = tab;
    const [path] = await postPaths(ctx);
    ctx.check(path !== undefined, "the site lists no Post");
    if (!path) return;
    await page.goto(ctx.url(path), { waitUntil: "load" });
    await settle(page, 1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByText("写一条新评论").first().click({ timeout: 20000 });

    const text = `flows comment ${Date.now()}`;
    await page.locator("textarea").first().fill(text);
    await page.locator(".comment-composer button[type=submit]").first().click();
    const mine = page.locator("article.comment-item", { hasText: text });
    const appeared = await mine
      .first()
      .waitFor({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    ctx.observe("commentAppears", appeared);
    ctx.observe(
      "toasts",
      (await tab.toasts()).join(" | ").slice(0, 60) || "none",
    );
    ctx.check(appeared, "the comment did not appear after posting");
    if (!appeared) return;

    await mine.first().locator(".comment-management button").click();
    await page.getByRole("menuitem", { name: "删除" }).click();
    await page.getByRole("button", { name: "确认删除" }).click();
    const gone = await page
      .locator("article.comment-item", { hasText: text })
      .first()
      .waitFor({ state: "detached", timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    const marked = (await page.locator(".comment-deleted").count()) > 0;
    ctx.observe("commentDeleted", gone || marked);
    ctx.check(gone || marked, "the comment was not deleted");
  },
};
