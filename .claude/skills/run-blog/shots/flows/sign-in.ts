import type { Flow } from "./context.ts";
import {
  accountLabel,
  readAccountMenu,
  sessionCookie,
  settle,
} from "./helpers.ts";

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

export const signIn: Flow = {
  name: "sign-in",
  summary:
    "signing in with a mocked one-time code updates the navigation without a full page load and shows its toast",
  needs: ["cookie"],
  async run(ctx) {
    const tab = await ctx.open();
    const { page, context } = tab;
    // The code is never checked: the answers are mocked, and the sign-in
    // answer is where the server would set the cookie, so the run's own
    // session cookie is set there.
    await page.route("**/api/auth/email-otp/send-verification-otp", (route) =>
      route.fulfill(json({ success: true })),
    );
    await page.route("**/api/auth/sign-in/email-otp", async (route) => {
      await context.addCookies([sessionCookie(ctx)]);
      await route.fulfill(
        json({
          token: "x",
          user: {
            id: "u",
            name: "Admin",
            email: "a@b.co",
            emailVerified: true,
          },
        }),
      );
    });

    await page.goto(ctx.url("/login"), { waitUntil: "load" });
    await settle(page, 1500);
    const labelBefore = await accountLabel(page);
    await page.locator("input[type=email]").fill("a@b.co");
    await page.locator("form button[type=submit]").first().click();
    await page.locator("form input:not([type=email])").first().fill("123456");
    let loads = 0;
    page.on("load", () => loads++);
    await page.locator("form button[type=submit]").first().click();
    await page.waitForURL((url) => url.pathname !== "/login", {
      timeout: 20000,
    });
    const toasts = await tab.waitForToast(10000);
    await settle(page, 1000);
    const labelAfter = await accountLabel(page);
    const menu = await readAccountMenu(page);

    ctx.observe("fullLoads", loads);
    ctx.observe("navigationChanged", labelAfter !== labelBefore);
    ctx.observe("adminEntry", menu.adminEntry);
    ctx.observe("toast", toasts.join(" | ").slice(0, 60) || "none");
    ctx.check(loads === 0, `${loads} full page loads while signing in`);
    ctx.check(
      labelAfter !== labelBefore,
      `the account button still reads "${labelAfter}"`,
    );
    ctx.check(
      menu.identity !== "" && !menu.loginEntry,
      "the menu does not show an account",
    );
    ctx.check(toasts.length > 0, "no toast after signing in");
  },
};
