import { createMiddleware } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import type { RateLimitOptions } from "@/lib/do/rate-limiter";
import { CACHE_CONTROL } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth/auth.server";

// ======================= Cache Control ====================== */
// deprecated 感觉没啥用了，现在都是hono api来获取公开博客数据了，hono那里设置好缓存头就行了
export const createCacheHeaderMiddleware = (
  strategy: "private" | "immutable" | "swr" | "public",
) => {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    const result = await next();

    // 只在客户端直接请求 Server Function 时设置 headers
    // SSR 期间请求 Accept header 为 text/html，此时不设置 headers，让 route headers() 生效
    // 客户端 React Query 请求 Accept header 包含 application/json
    const accept = getRequestHeader("Accept");
    const isClientRequest = accept?.includes("application/json");

    if (isClientRequest) {
      Object.entries(CACHE_CONTROL[strategy]).forEach(([k, v]) => {
        setResponseHeader(k, v);
      });
    }

    return result;
  });
};

/* ======================= Infrastructure ====================== */

export const dbMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const db = getDb(context.env);
    return next({
      context: {
        db,
      },
    });
  },
);

export const sessionMiddleware = createMiddleware({ type: "function" })
  .middleware([dbMiddleware])
  .server(async ({ next, context }) => {
    const auth = getAuth({
      db: context.db,
      env: context.env,
    });
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    return next({
      context: {
        auth,
        session,
      },
    });
  });

export const authMiddleware = createMiddleware({ type: "function" })
  .middleware([createCacheHeaderMiddleware("private"), sessionMiddleware])
  .server(async ({ next, context }) => {
    const session = context.session;

    if (!session) {
      throw Response.json({ message: "UNAUTHENTICATED" }, { status: 401 });
    }

    return next({
      context: {
        session,
      },
    });
  });

export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ context, next }) => {
    const session = context.session;

    if (session.user.role !== "admin") {
      throw Response.json({ message: "PERMISSION_DENIED" }, { status: 403 });
    }

    return next({
      context: {
        session,
      },
    });
  });

/* ======================= Rate Limiting ====================== */
export const createRateLimitMiddleware = (
  options: RateLimitOptions & { key?: string },
) => {
  return createMiddleware({ type: "function" })
    .middleware([sessionMiddleware])
    .server(async ({ next, context }) => {
      const session = context.session;

      const identifier =
        session?.user.id || getRequestHeader("cf-connecting-ip") || "unknown";
      const scope = options.key || "default";
      const uniqueIdentifier = `${identifier}:${scope}`;

      const id = context.env.RATE_LIMITER.idFromName(uniqueIdentifier);
      const rateLimiter = context.env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit(options);

      if (!result.allowed) {
        throw Response.json(
          {
            message: "Too Many Requests",
            retryAfterSeconds: result.retryAfterMs / 1000,
          },
          { status: 429 },
        );
      }

      return next();
    });
};
