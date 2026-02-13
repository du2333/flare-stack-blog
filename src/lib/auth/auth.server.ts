import { renderToStaticMarkup } from "react-dom/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { AuthEmail } from "@/features/email/templates/AuthEmail";
import { authConfig } from "@/lib/auth/auth.config";
import * as authSchema from "@/lib/db/schema/auth.table";
import { serverEnv } from "@/lib/env/server.env";

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

let auth: Auth | null = null;

export function getAuth({ db, env }: { db: DB; env: Env }) {
  if (auth) return auth;

  auth = createAuth({ db, env });
  return auth;
}

function createAuth({ db, env }: { db: DB; env: Env }) {
  const {
    BETTER_AUTH_SECRET,
    BETTER_AUTH_URL,
    ADMIN_EMAIL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
  } = serverEnv(env);

  // 每次请求随机 DO 实例，避免 CPU 密集型哈希操作串行
  function getPasswordHasher() {
    const id = env.PASSWORD_HASHER.idFromName(crypto.randomUUID());
    return env.PASSWORD_HASHER.get(id);
  }

  return betterAuth({
    ...authConfig,
    socialProviders: {
      github: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      password: {
        hash: (password: string) => getPasswordHasher().hash(password),
        verify: (params: { hash: string; password: string }) =>
          getPasswordHasher().verify(params),
      },
      sendResetPassword: async ({ user, url }) => {
        // Per-email rate limit: 3 per hour — silently skip if exceeded
        const allowed = await checkEmailRateLimit(
          env,
          "email-reset",
          user.email,
        );
        if (!allowed) return;

        const emailHtml = renderToStaticMarkup(
          AuthEmail({ type: "reset-password", url }),
        );

        await env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: user.email,
            subject: "重置密码",
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
          AuthEmail({ type: "verification", url }),
        );

        await env.QUEUE.send({
          type: "EMAIL",
          data: {
            to: user.email,
            subject: "验证您的邮箱",
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

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
