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
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isNotInProduction, serverEnv } from "@/lib/env/server.env";
import * as schema from "@/lib/db/schema";

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
    const env = serverEnv(context.env);
    const auth = getAuth({
      db: context.db,
      env: context.env,
    });

    let session: Session | null = null;

    // Dev-only admin bypass: 仅在非生产环境下，通过 ADMIN_TOKEN 绕过 OAuth
    if (isNotInProduction(context.env) && env.ADMIN_TOKEN) {
      const authHeader = getRequestHeader("Authorization");
      const cookies = getRequestHeader("Cookie") ?? "";
      const cookieToken = cookies
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("admin-token="))
        ?.split("=")[1];
      const providedToken = authHeader?.replace("Bearer ", "") || cookieToken;

      if (providedToken === env.ADMIN_TOKEN) {
        const now = new Date();
        const adminUser = {
          id: "dev-admin",
          name: "Dev Admin",
          email: env.ADMIN_EMAIL,
          emailVerified: true,
          role: "admin" as const,
          image: null,
          banned: false,
          banReason: null,
          banExpires: null,
          createdAt: now,
          updatedAt: now,
        };

        // 自动 seed 到数据库，避免外键约束失败
        context.executionCtx.waitUntil(
          context.db
            .insert(schema.user)
            .values(adminUser)
            .onConflictDoUpdate({
              target: schema.user.id,
              set: { role: "admin", updatedAt: now },
            }),
        );

        session = {
          user: adminUser,
          session: {
            id: "dev-admin-session",
            userId: "dev-admin",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            token: env.ADMIN_TOKEN,
            createdAt: now,
            updatedAt: now,
            ipAddress: "127.0.0.1",
            userAgent: "DevAdminBypass",
            impersonatedBy: null,
          },
        };
      }
    }

    // 正常 auth 流程（仅在 bypass 未生效时走）
    if (!session) {
      session = await auth.api.getSession({
        headers: getRequestHeaders(),
      });
    }

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
      throw new Error("UNAUTHENTICATED");
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
      throw new Error("PERMISSION_DENIED");
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
        getRequestHeader("cf-connecting-ip") || session?.user.id || "unknown";
      const scope = options.key || "default";
      const uniqueIdentifier = `${identifier}:${scope}`;

      const id = context.env.RATE_LIMITER.idFromName(uniqueIdentifier);
      const rateLimiter = context.env.RATE_LIMITER.get(id);

      const result = await rateLimiter.checkLimit(options);

      if (!result.allowed) {
        throw new Error(
          `请求过于频繁，请 ${Math.ceil(result.retryAfterMs / 1000)} 秒后重试`,
        );
      }

      return next();
    });
};

/* ======================= Turnstile ====================== */
export const turnstileMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    // Dynamically import to avoid SSR issues
    const { getTurnstileToken } = await import("@/components/common/turnstile");
    const token = getTurnstileToken();
    return next({
      headers: {
        "X-Turnstile-Token": token || "",
      },
    });
  })
  .server(async ({ next, context }) => {
    const secretKey = serverEnv(context.env).TURNSTILE_SECRET_KEY;
    if (!secretKey) return next(); // 未配置则跳过验证

    const token = getRequestHeader("X-Turnstile-Token");
    if (!token) {
      throw new Error("Missing Turnstile token");
    }

    const result = await verifyTurnstileToken({ secretKey, token });

    if (!result.success) {
      throw new Error("人机验证失败，请刷新页面重试");
    }

    return next();
  });
