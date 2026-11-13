import type { Flow } from "./context.ts";
import { AUTH_CLIENT, TOAST_LIBRARY, requested, settle } from "./helpers.ts";

export const anonymousHome: Flow = {
  name: "anonymous-home",
  summary:
    "an anonymous home page asks for the session once and loads neither the auth client nor the toast library",
  async run(ctx) {
    const tab = await ctx.open();
    await tab.page.goto(ctx.url("/"), { waitUntil: "load" });
    await settle(tab.page, 3000);

    const sessions = requested(tab, /\/api\/auth\/get-session/).length;
    const authRequests = requested(tab, AUTH_CLIENT);
    const toastRequests = requested(tab, TOAST_LIBRARY);
    const auth = authRequests.length;
    const toast = toastRequests.length;
    ctx.observe("getSessionRequests", sessions);
    ctx.observe("authClientChunks", auth);
    ctx.observe("toastLibraryChunks", toast);
    ctx.check(sessions === 1, `${sessions} get-session requests, expected 1`);
    ctx.check(
      auth === 0,
      `the auth client was requested: ${authRequests[0]?.url.pathname}`,
    );
    ctx.check(
      toast === 0,
      `the toast library was requested: ${toastRequests[0]?.url.pathname}`,
    );
  },
};
