import { createAuthMiddleware } from "@better-auth/core/api";
import { APIError } from "@better-auth/core/error";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getSessionFromCtx } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthEmail } from "@/features/email/templates/AuthEmail";
import {
  inspectApiKeyManagementAccess,
  isApiKeyManagementPath,
} from "@/lib/auth/api-key-guard";
import { createAuthConfig } from "@/lib/auth/auth.config";
import * as authSchema from "@/lib/db/schema/auth.table";
import { serverEnv } from "@/lib/env/server.env";
import { m } from "@/paraglide/messages";

async function checkEmailRateLimit(
  env: Env,
  scope: string,
  email: string,
): Promise<boolean> {
  const identifier = `${scope}:${email.toLowerCase().trim()}`;
  const id = env.RATE_LIMITER.idFromName(identifier);
  const rateLimiter = env.RATE_LIMITER.get(id);
  const result = await rateLimiter.checkLimit({
    capacity: 3,
    interval: "1h",
  });
  return result.allowed;
}

export function getAuth({ db, env }: { db: DB; env: Env }) {
  const {
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    ADMIN_EMAIL,
    LOCALE,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
  } = serverEnv(env);

  return betterAuth({
    ...createAuthConfig(),
    socialProviders: {
      github: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const email =
            typeof ctx.body?.email === "string" ? ctx.body.email.trim() : "";
          if (!email) return;

          const allowed = await checkEmailRateLimit(env, "email-signup", email);
          if (!allowed) {
            throw APIError.from("BAD_REQUEST", {
              code: "RATE_LIMITED",
              message: "Too many sign up attempts",
            });
          }
        }

        if (!isApiKeyManagementPath(ctx.path)) return;

        const headers = ctx.headers ?? ctx.request?.headers ?? null;
        const hasApiKeyHeader = Boolean(headers?.get("x-api-key"));
        let role: string | null = null;
        if (ctx.request && !hasApiKeyHeader) {
          const session = await getSessionFromCtx(ctx);
          const user = session?.user as { role?: string | null } | undefined;
          role = user?.role ?? null;
        }
        const denial = inspectApiKeyManagementAccess({
          path: ctx.path,
          headers,
          isHttpRequest: Boolean(ctx.request),
          role,
        });
        if (!denial.denied) return;

        throw APIError.from("FORBIDDEN", {
          code: denial.code,
          message:
            denial.code === "API_KEY_CANNOT_MANAGE_API_KEYS"
              ? "API keys cannot manage API keys"
              : "Only an Admin can manage API keys",
        });
      }),
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        // Per-email rate limit: 3 per hour — silently skip if exceeded
        const allowed = await checkEmailRateLimit(
          env,
          "email-reset",
          user.email,
        );
        if (!allowed) return;

        const emailHtml = renderToStaticMarkup(
          AuthEmail({ locale: LOCALE, type: "reset-password", url }),
        );

        await env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: user.email,
            subject: m.email_auth_reset_subject({}, { locale: LOCALE }),
            html: emailHtml,
          },
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // Per-email rate limit: 3 per hour — silently skip if exceeded
        const allowed = await checkEmailRateLimit(
          env,
          "email-verify",
          user.email,
        );
        if (!allowed) return;

        const emailHtml = renderToStaticMarkup(
          AuthEmail({ locale: LOCALE, type: "verification", url }),
        );

        await env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: user.email,
            subject: m.email_auth_verification_subject({}, { locale: LOCALE }),
            html: emailHtml,
          },
        });
      },
      autoSignInAfterVerification: true,
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (user.email === ADMIN_EMAIL) {
              return { data: { ...user, role: "admin" } };
            }
            return { data: user };
          },
        },
      },
    },
    secret: BETTER_AUTH_SECRET,
    baseURL: BETTER_AUTH_URL,
  });
}

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"];
