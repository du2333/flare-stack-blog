import type { AnyContractProcedure } from "@orpc/contract";
import { ORPCError, os } from "@orpc/server";
import { z } from "zod";
import { sendsApiKey } from "@/lib/auth/api-key-guard";
import type { RateLimitOptions } from "@/lib/do/rate-limiter";
import { getRateLimiter } from "@/lib/do/rate-limiter-binding";
import { serverEnv } from "@/lib/env/server.env";
import { rateLimitKeyFromIp } from "@/lib/http/rate-limit-key";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { ApiContext, AuthedApiContext } from "./context";

async function readSession(context: ApiContext) {
  try {
    const auth = await context.getAuth();
    return await auth.api.getSession({ headers: context.headers });
  } catch (error) {
    // Imported here so better-auth stays out of the public procedures' module
    // graph; getAuth has already loaded it by the time getSession throws.
    const { isAPIError } = await import("better-auth/api");
    if (
      isAPIError(error) &&
      (error.statusCode === 401 || error.statusCode === 403)
    ) {
      // The API Key plugin answers 403 for a key too short to be one
      // (`notakey`, a truncated paste) but 401 for a well-formed wrong key;
      // every invalid key is the caller failing to authenticate.
      const invalidKey = error.body?.code === "INVALID_API_KEY";
      throw new ORPCError(
        error.statusCode === 401 || invalidKey ? "UNAUTHORIZED" : "FORBIDDEN",
        {
          cause: error,
        },
      );
    }
    throw error;
  }
}

/**
 * Only an operation that runs `withRateLimit` or `turnstileMiddleware` can
 * answer these, so it declares them itself with `.errors(...)` before `.use`;
 * the middleware is typed to need the declaration.
 */
export const rateLimitErrors = {
  RATE_LIMITED: {
    status: 429,
    message: "Too many requests.",
    data: z.object({ retryAfterMs: z.number() }),
  },
} as const;

export const turnstileErrors = {
  TURNSTILE_FAILED: {
    status: 400,
    message: "Turnstile verification failed.",
    data: z.object({
      detail: z.enum(["MISSING_TOKEN", "VERIFY_FAILED"]).optional(),
    }),
  },
} as const;

const accessErrors = {
  UNAUTHORIZED: {
    status: 401,
    message: "Authentication is required.",
  },
  FORBIDDEN: {
    status: 403,
    message: "Permission denied.",
  },
} as const;

export const publicProcedure = os.$context<ApiContext>().errors(accessErrors);

export const optionalSessionProcedure = publicProcedure.use(
  async ({ context, next }) => {
    const session = await readSession(context);

    return next({
      context: {
        session,
      },
    });
  },
);

export const authProcedure = publicProcedure.use(
  async ({ context, errors, next }) => {
    const session = await readSession(context);

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

const refuseApiKey = os
  .$context<ApiContext>()
  .errors({ FORBIDDEN: accessErrors.FORBIDDEN })
  .middleware(async ({ context, errors, next }) => {
    if (sendsApiKey(context.headers)) {
      throw errors.FORBIDDEN({
        message: "Only an Admin's browser session can do this, not an API Key.",
      });
    }
    return next();
  });

/**
 * An Admin operation of the admin UI that an API Key cannot call, such as
 * generating a Pairing Code: a key must not mint keys. The API document leaves
 * these operations out (`isBrowserSessionOnly`), since an agent cannot use them.
 */
export const browserAdminProcedure = adminProcedure.use(refuseApiKey);

export function isBrowserSessionOnly(procedure: AnyContractProcedure) {
  const { middlewares } = procedure["~orpc"] as {
    middlewares?: ReadonlyArray<unknown>;
  };
  return middlewares?.includes(refuseApiKey) ?? false;
}

// A signed-in User gets a bucket of their own; the IP bucket behind it only
// caps what one network can do through many accounts.
const IP_BACKSTOP: RateLimitOptions = { capacity: 30, interval: "1m" };

export function withRateLimit(options: RateLimitOptions & { key?: string }) {
  return os
    .$context<ApiContext>()
    .errors(rateLimitErrors)
    .middleware(async ({ context, errors, next }) => {
      const session = await readSession(context);
      const scope = options.key || "default";
      const ip = rateLimitKeyFromIp(context.headers.get("cf-connecting-ip"));

      const buckets = session
        ? [
            { name: `user:${session.user.id}:${scope}`, limit: options },
            { name: `${ip}:${scope}:backstop`, limit: IP_BACKSTOP },
          ]
        : [{ name: `${ip}:${scope}`, limit: options }];

      for (const bucket of buckets) {
        const rateLimiter = await getRateLimiter(bucket.name);
        const result = await rateLimiter.checkLimit(bucket.limit);
        if (!result.allowed) {
          throw errors.RATE_LIMITED({
            data: { retryAfterMs: result.retryAfterMs },
          });
        }
      }

      return next();
    });
}

function turnstile(options: { unlessAdmin?: boolean } = {}) {
  return os
    .$context<ApiContext>()
    .errors(turnstileErrors)
    .middleware(async ({ context, errors, next }) => {
      const secretKey = serverEnv(context.env).TURNSTILE_SECRET_KEY;
      if (!secretKey) return next();

      if (options.unlessAdmin) {
        const session = await readSession(context);
        if (session?.user.role === "admin") return next();
      }

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
    });
}

/** The caller proves it is a person, wherever Turnstile is configured. */
export const turnstileMiddleware = turnstile();

/**
 * As `turnstileMiddleware`, for an operation Users and the Admin both call:
 * an Admin is signed in and runs the site, so they are not challenged.
 */
export const turnstileUnlessAdmin = turnstile({ unlessAdmin: true });
