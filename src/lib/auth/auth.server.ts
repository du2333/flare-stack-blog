import { renderToStaticMarkup } from "react-dom/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { AuthEmail } from "@/features/email/templates/AuthEmail";
import { hashPassword, verifyPassword } from "@/lib/auth/auth.helpers";
import { authConfig } from "@/lib/auth/auth.config";
import * as authSchema from "@/lib/db/schema/auth.table";
import { serverEnv } from "@/lib/env/server.env";

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
        hash: hashPassword,
        verify: verifyPassword,
      },
      sendResetPassword: async ({ user, url }) => {
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
