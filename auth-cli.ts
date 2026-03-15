import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authConfig } from "@/lib/auth/auth.config";

export const auth = betterAuth({
  ...authConfig,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-for-schema-generation",
  database: drizzleAdapter(
    {},
    {
      provider: "sqlite",
    },
  ),
});
