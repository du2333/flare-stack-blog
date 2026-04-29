import { createMiddleware } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestHeaders,
} from "@tanstack/react-start/server";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import type { RateLimitOptions } from "@/lib/do/rate-limiter";
import { serverEnv } from "@/lib/env/server.env";
import {
  createAuthError,
  createPermissionError,
  createRateLimitError,
  createTurnstileError,
} from "@/lib/errors";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { eq } from "drizzle-orm";

/* ======================= Error Logging ====================== */

export const errorLoggingMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "server function error",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    throw error;
  }
});

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

    if (
      session &&
      session.user.role !== "superadmin" &&
      session.user.email.toLowerCase() === serverEnv(context.env).ADMIN_EMAIL?.toLowerCase()
    ) {
      await context.db
        .update(userTable)
        .set({ role: "superadmin" })
        .where(eq(userTable.id, session.user.id));
      session.user.role = "superadmin";
    }

    return next({
      context: {
        auth,
        session,
      },
    });
  });

export const authMiddleware = createMiddleware({ type: "function" })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    const session = context.session;

    if (!session) {
      throw createAuthError();
    }

    // Auto-upgrade: If user email matches ADMIN_EMAIL but role is still "admin",
    // upgrade to "superadmin" in the database (one-time migration).
    if (
      session.user.role === "admin" &&
      session.user.email === serverEnv(context.env).ADMIN_EMAIL
    ) {
      const { user: userTable } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      await context.db
        .update(userTable)
        .set({ role: "superadmin" })
        .where(eq(userTable.id, session.user.id));
      session.user.role = "superadmin";
    }

    return next({
      context: {
        session,
      },
    });
  });

/**
 * Super Admin middleware — only superadmin role.
 * Used for: dashboard overview, comments, friend-links, settings, user management, webhooks, etc.
 */
export const superAdminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ context, next }) => {
    const session = context.session;

    if (session.user.role !== "superadmin") {
      throw createPermissionError();
    }

    return next({
      context: {
        session,
      },
    });
  });

/**
 * Content Admin middleware — admin or superadmin role.
 * Used for: posts, tags, media management.
 */
export const contentAdminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ context, next }) => {
    const session = context.session;
    const role = session.user.role;

    if (role !== "admin" && role !== "superadmin") {
      throw createPermissionError();
    }

    return next({
      context: {
        session,
      },
    });
  });

/**
 * @deprecated Use `superAdminMiddleware` or `contentAdminMiddleware` instead.
 * Kept as alias to superAdminMiddleware for backward compatibility during migration.
 */
export const adminMiddleware = superAdminMiddleware;

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
        throw createRateLimitError(result.retryAfterMs);
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
      throw createTurnstileError("MISSING_TOKEN");
    }

    const result = await verifyTurnstileToken({ secretKey, token });

    if (!result.success) {
      throw createTurnstileError("VERIFY_FAILED");
    }

    return next();
  });
