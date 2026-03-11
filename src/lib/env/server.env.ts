import { z } from "zod";

const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const localeSchema = z.enum(["zh", "en"]);
const domainSchema = z
  .string()
  .regex(domainRegex, "Must be a valid domain (e.g., www.example.com)");

const serverEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.url(),
  ADMIN_EMAIL: z.email(),
  LOCALE: localeSchema.catch("zh"),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  CLOUDFLARE_ZONE_ID: z.string(),
  CLOUDFLARE_PURGE_API_TOKEN: z.string(),
  DOMAIN: domainSchema,
  CDN_DOMAIN: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine(
      (v) => v === undefined || domainRegex.test(v),
      "Must be a valid domain (e.g., cdn.example.com)",
    ),
  ENVIRONMENT: z.enum(["dev", "prod", "test"]).optional(),
  VITE_UMAMI_WEBSITE_ID: z.string().optional(),
  UMAMI_SRC: z.string().optional(),
  UMAMI_API_KEY: z.string().optional(),
  UMAMI_USERNAME: z.string().optional(),
  UMAMI_PASSWORD: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
});

export function serverEnv(env: Env) {
  const result = serverEnvSchema.safeParse(env);

  if (!result.success) {
    console.error(
      JSON.stringify({
        message: "Invalid environment variables",
        error: z.treeifyError(result.error),
      }),
    );
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const isNotInProduction = (env: Env) =>
  serverEnv(env).ENVIRONMENT === "test" || serverEnv(env).ENVIRONMENT === "dev";
