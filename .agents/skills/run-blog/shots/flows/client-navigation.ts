import type { Flow } from "./context.ts";
import { API_CALL, POST_LINK, requested, settle } from "./helpers.ts";

export const clientNavigation: Flow = {
  name: "client-navigation",
  summary:
    "home to /posts to a Post by client-side links: the API calls answer 200, the Post's title and body appear",
  async run(ctx) {
    const tab = await ctx.open();
    const { page } = tab;
    await page.goto(ctx.url("/"), { waitUntil: "load" });
    await settle(page, 1500);
    // A full page load would drop this.
    await page.evaluate(() => {
      (window as unknown as { __flows: number }).__flows = 1;
    });
    const sameDocument = () =>
      page.evaluate(
        () => (window as unknown as { __flows?: number }).__flows === 1,
      );
    const since = Date.now();

    await page.locator('a[href="/posts"]:visible').first().click();
    await page.waitForURL(/\/posts$/, { timeout: 20000 });
    const link = page.locator(POST_LINK).first();
    await link.waitFor({ timeout: 20000 });
    const listed = ((await link.textContent()) ?? "").replace(/\s+/g, " ");
    const href = (await link.getAttribute("href")) ?? "";
    await page.locator(`a[href="${href}"]:visible`).first().click();
    await page.waitForURL((url) => url.pathname.startsWith("/post/"), {
      timeout: 20000,
    });
    const title = page.locator("h1.fuwari-page-title");
    await title.waitFor({ timeout: 20000 });
    const heading = ((await title.textContent()) ?? "").trim();
    const body = page.locator(".fuwari-custom-md").first();
    await body.waitFor({ timeout: 20000 });
    const bodyLength = (await body.innerText()).trim().length;
    await settle(page, 1000);

    const calls = requested(tab, API_CALL, since);
    const failed = calls.filter(
      (call) => call.status !== undefined && call.status !== 200,
    );
    ctx.observe("sameDocument", await sameDocument());
    ctx.observe("apiCalls", calls.length);
    ctx.observe("apiNon200", failed.length);
    ctx.observe("titleMatchesList", heading !== "" && listed.includes(heading));
    ctx.observe("bodyHasText", bodyLength > 20);
    ctx.check(await sameDocument(), "a link made a full page load");
    ctx.check(
      failed.length === 0,
      `API calls answered ${failed.map((c) => `${c.status} ${c.url.pathname}`).join(", ")}`,
    );
    ctx.check(heading !== "", `no title on ${href}`);
    ctx.check(
      heading === "" || listed.includes(heading),
      `list entry "${listed.slice(0, 40)}" is not the Post "${heading}"`,
    );
    ctx.check(bodyLength > 20, `the body of ${href} is empty`);
  },
};
