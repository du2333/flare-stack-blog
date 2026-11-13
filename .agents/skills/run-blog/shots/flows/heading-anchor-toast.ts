import type { Flow } from "./context.ts";
import { TOAST_LIBRARY, postPaths, requested, settle } from "./helpers.ts";

export const headingAnchorToast: Flow = {
  name: "heading-anchor-toast",
  summary:
    "a heading anchor on a Post shows a toast, the first one, and the toast library is requested only after the click",
  async run(ctx) {
    const tab = await ctx.open();
    const { page } = tab;
    let found = "";
    // The site's own Posts first; the sample data's long read only as a last
    // resort, since another site answers 404 for it.
    for (const path of [
      ...(await postPaths(ctx)).slice(0, 8),
      "/post/sample-long-read",
    ]) {
      await page.goto(ctx.url(path), { waitUntil: "load" });
      await settle(page, 1500);
      if (await page.locator("a.anchor").count()) {
        found = path;
        break;
      }
    }
    ctx.check(
      found !== "",
      "no Post with a heading anchor among the first Posts",
    );
    if (!found) return;

    const beforeToasts = await tab.toasts();
    const beforeLibrary = requested(tab, TOAST_LIBRARY).length;
    const anchor = page.locator("a.anchor").first();
    await anchor.scrollIntoViewIfNeeded();
    const clicked = Date.now();
    await anchor.click({ force: true });
    const shown = await tab.waitForToast(10000);
    const afterLibrary = requested(tab, TOAST_LIBRARY, clicked).length;

    ctx.observe("toastsBeforeClick", beforeToasts.length);
    ctx.observe("toastLibraryBeforeClick", beforeLibrary);
    ctx.observe("toastLibraryAfterClick", afterLibrary > 0);
    ctx.observe("toast", shown.join(" | ").slice(0, 60) || "none");
    ctx.check(
      beforeToasts.length === 0,
      "a toast was on screen before the click",
    );
    ctx.check(
      beforeLibrary === 0,
      "the toast library was requested before the click",
    );
    ctx.check(shown.length > 0, "no toast after the click");
    ctx.check(
      afterLibrary > 0,
      "the toast library was not requested by the click",
    );
  },
};
