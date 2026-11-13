import type { Flow, Tab } from "./context.ts";
import { settle } from "./helpers.ts";

/** Waits until no toast is on screen, so the next one is told apart from the last. */
async function toastsGone(tab: Tab) {
  await tab.page
    .waitForFunction(
      () => !document.querySelector("[data-sonner-toast]"),
      undefined,
      {
        timeout: 15000,
      },
    )
    .catch(() => {});
}

export const profileAndNotifications: Flow = {
  name: "profile-and-notifications",
  summary:
    "signed in, saving the profile and switching the notification setting show their toasts (both are put back)",
  needs: ["session"],
  async run(ctx) {
    const tab = await ctx.open({ signedIn: true });
    const { page } = tab;
    await page.goto(ctx.url("/profile"), { waitUntil: "load" });
    await settle(page, 2000);

    const name = page.locator("input[name=name]").first();
    const save = page.getByRole("button", { name: "保存" });
    const original = await name.inputValue();
    const changed =
      original.length < 20 ? `${original}X` : original.slice(0, -1);
    try {
      await name.fill(changed);
      await save.click();
      const saved = await tab.waitForToast(10000);
      ctx.observe("profileSaveToast", saved.join(" | ").slice(0, 60) || "none");
      ctx.check(saved.length > 0, "no toast after saving the profile");
    } finally {
      await toastsGone(tab);
      await name.fill(original);
      await save.click();
      await tab.waitForToast(10000);
    }

    await toastsGone(tab);
    const toggle = page.getByRole("switch").first();
    ctx.check(await toggle.isEnabled(), "the notification switch is disabled");
    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    const switched = await tab.waitForToast(10000);
    ctx.observe(
      "notificationToast",
      switched.join(" | ").slice(0, 60) || "none",
    );
    ctx.observe(
      "notificationSwitched",
      (await toggle.getAttribute("aria-checked")) !== before,
    );
    ctx.check(switched.length > 0, "no toast after the notification switch");
    await toastsGone(tab);
    await toggle.click();
    await tab.waitForToast(10000);
    ctx.check(
      (await toggle.getAttribute("aria-checked")) === before,
      "the notification switch was not put back",
    );
  },
};
