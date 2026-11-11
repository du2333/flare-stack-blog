import { QueryClient } from "@tanstack/react-query";
import { defaultParseSearch } from "@tanstack/react-router";
import { env, exports } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { fixtureTheme } from "tests/theme-fixture/theme";
import { beforeEach, expect, it, vi } from "vitest";
import { resolveSiteConfig } from "@/features/config/config.resolve";
import { getAuth } from "@/lib/auth/auth.server";
import { CACHE_CONTROL } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";

// Stands in for the request TanStack Start is rendering, as in
// src/lib/orpc/lazy-auth.integration.test.ts.
const ssr = vi.hoisted(() => ({
  context: undefined as
    | { env: Env; executionCtx: ExecutionContext<unknown> }
    | undefined,
  headers: new Headers(),
}));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-start")>()),
  getGlobalStartContext: () => ssr.context,
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequestHeaders: () => ssr.headers,
}));

vi.resetModules();
const { activeTheme, resolveThemePreview } = await import("./theme-preview");
const { previewViewerIsAdmin } = await import("./utils/preview-viewer");
const { THEMES } = await import("./themes");
const { themePreviewHref } = await import("./utils/theme-preview-params");
const { default: startHandler } =
  await import("@tanstack/react-start/server-entry");

const themes = [...THEMES, fixtureTheme];
const saved = resolveSiteConfig({});
const PREVIEW = themePreviewHref(fixtureTheme.id, { marker: "off" });

/**
 * The SSR render, reduced to what the root route and the `_public` route do
 * with a preview: resolve it from the search, then link the active Theme's
 * stylesheet and set its `data-theme`. The render sees the request exactly
 * as the default fetch handler forwarded it.
 */
const rendered: Array<{ url: string; theme: string }> = [];
beforeEach(() => {
  vi.spyOn(startHandler, "fetch").mockImplementation(
    async (request, options) => {
      ssr.context = options?.context as typeof ssr.context;
      ssr.headers = request.headers;
      const search = defaultParseSearch(new URL(request.url).search);

      const preview = await resolveThemePreview(
        search,
        () => previewViewerIsAdmin(new QueryClient()),
        themes,
      );
      const { theme, options: themeOptions } = activeTheme(
        saved,
        preview,
        themes,
      );
      rendered.push({ url: request.url, theme: theme.id });
      return new Response(
        `<html data-theme="${theme.id}" data-options='${JSON.stringify(themeOptions)}'><head><link rel="stylesheet" href="${theme.stylesheet}"></head></html>`,
        { headers: { "Content-Type": "text/html", ...CACHE_CONTROL.html } },
      );
    },
  );
  rendered.length = 0;
});

/** Signs a User in with a Sign-in Code and returns their session cookie. */
async function signIn(email: string, role: "admin" | null) {
  const queueSend = vi.spyOn(env.QUEUE, "send").mockResolvedValue({
    metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
  });
  const db = getDb(env);
  const auth = getAuth({ db, env });
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  const message = queueSend.mock.calls.at(-1)?.[0] as {
    data: { html: string };
  };
  const otp = /letter-spacing:8px[^>]*>(\d{6})</.exec(message.data.html)?.[1];
  if (!otp) throw new Error("No Sign-in Code in the queued email");
  const { headers } = await auth.api.signInEmailOTP({
    body: { email, otp },
    returnHeaders: true,
  });
  await db.update(user).set({ role }).where(eq(user.email, email));
  // Only the session token, so the role is read from the database rather
  // than from the cookie cache of the sign-in.
  return headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((cookie) => cookie.startsWith("better-auth.session_token="))
    .join("; ");
}

async function get(path: string, cookie?: string) {
  const response = await exports.default.fetch(`http://localhost:3000${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const html = await response.text();
  return {
    dataTheme: /<html data-theme="([^"]*)"/.exec(html)?.[1],
    options: /data-options='([^']*)'/.exec(html)?.[1],
    stylesheet: /<link rel="stylesheet" href="([^"]*)"/.exec(html)?.[1],
    cacheControl: response.headers.get("Cache-Control"),
    cacheTag: response.headers.get("Cache-Tag"),
  };
}

// Each test starts from the stored state before it, so each signs in anew.
let adminCookie = "";
let readerCookie = "";
beforeEach(async () => {
  adminCookie = await signIn("preview-admin@example.com", "admin");
  readerCookie = await signIn("preview-reader@example.com", null);
});

it("ignores the preview for an anonymous visitor and renders without it", async () => {
  const page = await get(PREVIEW);

  expect(page.dataTheme).toBe("classic");
  expect(page.stylesheet).toBe(THEMES[0]!.stylesheet);
  expect(page.cacheControl).toBe(CACHE_CONTROL.html["Cache-Control"]);
  expect(page.cacheTag).toBe("html,posts,popularity,moments");
  // Served as the plain page: either rendered without the parameters or
  // straight from its cache entry.
  for (const render of rendered) {
    expect(new URL(render.url).search).toBe("");
  }
});

it("gives a signed-in non-Admin and an unknown session the saved Theme, uncached", async () => {
  for (const cookie of [
    readerCookie,
    "better-auth.session_token=not-a-session",
  ]) {
    const page = await get(PREVIEW, cookie);

    expect(page.dataTheme).toBe("classic");
    expect(page.stylesheet).toBe(THEMES[0]!.stylesheet);
    expect(page.cacheControl).toBe(CACHE_CONTROL.private["Cache-Control"]);
    expect(page.cacheTag).toBeNull();
  }
});

it("renders the previewed Theme and its options for the Admin, uncached", async () => {
  const page = await get(PREVIEW, adminCookie);

  expect(page.dataTheme).toBe(fixtureTheme.id);
  expect(page.stylesheet).toBe(fixtureTheme.stylesheet);
  expect(JSON.parse(page.options!)).toEqual({ marker: "off" });
  expect(page.cacheControl).toMatch(/^private, no-store/);
  expect(page.cacheTag).toBeNull();
  expect(rendered).toHaveLength(1);
});

// The test runtime stores nothing in Workers Caching, so this holds the
// renders to what follows a preview; that the cache never stores one rests on
// the headers above and the bypass in `workersCacheRoute`, and on a real
// build in scripts/check-theme-styles.ts.
it("leaves nothing of an Admin's preview for the next visitor", async () => {
  // Fill the plain entry, preview as the Admin on the same address and on a
  // page the plain entry does not exist for yet, then visit both anonymously.
  await get("/");
  expect((await get(PREVIEW, adminCookie)).dataTheme).toBe(fixtureTheme.id);
  expect((await get(`/posts${PREVIEW.slice(1)}`, adminCookie)).dataTheme).toBe(
    fixtureTheme.id,
  );

  for (const path of ["/", "/posts", PREVIEW]) {
    const page = await get(path);
    expect(page.dataTheme).toBe("classic");
    expect(page.stylesheet).toBe(THEMES[0]!.stylesheet);
  }
  // The Admin's own next plain visit is the saved Theme too.
  expect((await get("/", adminCookie)).dataTheme).toBe("classic");
});
