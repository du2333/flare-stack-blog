import { Hono } from "hono";
import handler from "@tanstack/react-start/server-entry";
import { proxy } from "hono/proxy";
import {
  baseMiddleware,
  cacheMiddleware,
  rateLimitMiddleware,
  shieldMiddleware,
  turnstileMiddleware,
} from "./middlewares";
import { createRateLimiterIdentifier } from "./helper";
import { handleImageRequest } from "@/features/media/media.service";
import { serverEnv } from "@/lib/env/server.env";
import postsListRoute from "@/features/posts/api/hono/posts.list.route";
import postsDetailRoute from "@/features/posts/api/hono/posts.detail.route";
import postsRelatedRoute from "@/features/posts/api/hono/posts.related.route";
import tagsRoute from "@/features/tags/api/hono/tags.list.route";
import searchRoute from "@/features/search/api/hono/search.route";
import { exportDownloadRoute } from "@/features/import-export/api/hono/download.route";

export const app = new Hono<{ Bindings: Env }>();

app.get("*", cacheMiddleware);

/* ================================ Public API ================================ */

// Public API routes with RPC support - 链式调用保留类型推断
const publicApi = new Hono<{ Bindings: Env }>()
  .route("/posts", postsListRoute)
  .route("/post", postsDetailRoute)
  .route("/post", postsRelatedRoute)
  .route("/tags", tagsRoute)
  .route("/search", searchRoute);

// Mount public API
app.route("/api", publicApi);

// Export type for RPC client
export type PublicApiType = typeof publicApi;

/* ================================ 路由开始 ================================ */
app.get("/stats.js", async (c) => {
  const env = serverEnv(c.env);
  const umamiSrc = env.UMAMI_SRC;
  if (!umamiSrc) {
    return c.text("Not Found", 404);
  }
  const scriptUrl = new URL("/script.js", umamiSrc).toString();
  const response = await proxy(scriptUrl);
  response.headers.set(
    "Cache-Control",
    "public, max-age=3600, stale-while-revalidate=86400",
  );
  return response;
});

app.all("/api/send", async (c) => {
  const env = serverEnv(c.env);
  const umamiSrc = env.UMAMI_SRC;
  if (!umamiSrc) {
    return c.text("Not Found", 404);
  }
  const sendUrl = new URL("/api/send", umamiSrc).toString();
  return proxy(sendUrl, c.req);
});

app.get("/images/:key{.+}", async (c) => {
  const key = c.req.param("key");

  if (!key) return c.text("Image key is required", 400);

  try {
    return await handleImageRequest(c.env, key, c.req.raw);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "r2 image fetch failed",
        key,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return c.text("Internal server error", 500);
  }
});

app.get("/api/auth/*", baseMiddleware, (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

// 1. Protected auth endpoints (requires Turnstile)
const protectedPaths = [
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/sign-in/social",
  "/api/auth/request-password-reset",
  "/api/auth/send-verification-email",
] as const;

protectedPaths.forEach((path) => {
  app.post(
    path,
    baseMiddleware,
    turnstileMiddleware,
    rateLimitMiddleware({
      capacity: 5,
      interval: "1m",
      identifier: createRateLimiterIdentifier,
    }),
    rateLimitMiddleware({
      capacity: 10,
      interval: "1h",
      identifier: (c) => `hourly:${createRateLimiterIdentifier(c)}`,
    }),
    (c) => {
      const auth = c.get("auth");
      return auth.handler(c.req.raw);
    },
  );
});

// 2. Other auth POST endpoints (e.g. sign-out, change-password, reset-password etc.)
app.post(
  "/api/auth/*",
  baseMiddleware,
  rateLimitMiddleware({
    capacity: 5,
    interval: "1m",
    identifier: createRateLimiterIdentifier,
  }),
  (c) => {
    const auth = c.get("auth");
    return auth.handler(c.req.raw);
  },
);

// Admin export download route
app.route("/api/admin/export", exportDownloadRoute);

// Router之前的防护
app.all("*", shieldMiddleware);

app.all("*", (c) => {
  return handler.fetch(c.req.raw, {
    context: {
      env: c.env,
      executionCtx: c.executionCtx,
    },
  });
});
