import { os } from "@orpc/server";
import { z } from "zod";
import type { RateLimitOptions } from "@/lib/do/rate-limiter";
import { serverEnv } from "@/lib/env/server.env";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ApiContext, AuthedApiContext } from "./context";

export const publicProcedure = os.$context<ApiContext>().errors({
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication is required.",
  },
  FORBIDDEN: {
    status: 403,
    message: "Permission denied.",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Too many requests.",
    data: z.object({ retryAfterMs: z.number() }),
  },
  TURNSTILE_FAILED: {
    status: 400,
    message: "Turnstile verification failed.",
    data: z.object({
      detail: z.enum(["MISSING_TOKEN", "VERIFY_FAILED"]).optional(),
    }),
  },
});

export const optionalSessionProcedure = publicProcedure.use(
  async ({ context, next }) => {
    const session = await context.auth.api.getSession({
      headers: context.headers,
    });

    return next({
      context: {
        session,
      },
    });
  },
);

export const authProcedure = publicProcedure.use(
  async ({ context, errors, next }) => {
    const session = await context.auth.api.getSession({
      headers: context.headers,
    });

    if (!session) {
      throw errors.UNAUTHORIZED();
    }

    return next({
      context: {
        session,
      } satisfies Pick<AuthedApiContext, "session">,
    });
  },
);

export const adminProcedure = authProcedure.use(
  async ({ context, errors, next }) => {
    if (context.session.user.role !== "admin") {
      throw errors.FORBIDDEN();
    }

    return next();
  },
);

export function withRateLimit(options: RateLimitOptions & { key?: string }) {
  return publicProcedure.middleware(async ({ context, errors, next }) => {
    const session = await context.auth.api.getSession({
      headers: context.headers,
    });
    const identifier =
      context.headers.get("cf-connecting-ip") || session?.user.id || "unknown";
    const scope = options.key || "default";
    const uniqueIdentifier = `${identifier}:${scope}`;

    const id = context.env.RATE_LIMITER.idFromName(uniqueIdentifier);
    const rateLimiter = context.env.RATE_LIMITER.get(id);
    const result = await rateLimiter.checkLimit(options);

    if (!result.allowed) {
      throw errors.RATE_LIMITED({
        data: { retryAfterMs: result.retryAfterMs },
      });
    }

    return next();
  });
}

export const turnstileMiddleware = publicProcedure.middleware(
  async ({ context, errors, next }) => {
    const secretKey = serverEnv(context.env).TURNSTILE_SECRET_KEY;
    if (!secretKey) return next();

    const token = context.headers.get("X-Turnstile-Token");
    if (!token) {
      throw errors.TURNSTILE_FAILED({
        data: { detail: "MISSING_TOKEN" },
      });
    }

    const result = await verifyTurnstileToken({ secretKey, token });
    if (!result.success) {
      throw errors.TURNSTILE_FAILED({
        data: { detail: "VERIFY_FAILED" },
      });
    }

    return next();
  },
);
