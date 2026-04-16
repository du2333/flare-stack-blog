import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthConfig } from "@/lib/auth/auth.config";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  ...createAuthConfig(),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-for-schema-generation",
  database: drizzleAdapter(
    {},
    {
      provider: "sqlite",
    },
  ),
});
