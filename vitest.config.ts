import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { loadEnv } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import packageJson from "./package.json";

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      cloudflareTest({
        wrangler: {
          configPath: "./wrangler.jsonc",
          environment: "test",
        },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            BETTER_AUTH_SECRET:
              "a-very-long-test-secret-that-is-at-least-32-chars-long",
            BETTER_AUTH_URL: "http://localhost:3000",
            GITHUB_CLIENT_ID: "test-id",
            GITHUB_CLIENT_SECRET: "test-secret",
            DOMAIN: "example.com",
            ENVIRONMENT: "test",
          },
        },
        remoteBindings: false,
      }),
    ],
    resolve: {
      alias: {
        "@tanstack/react-start/server-entry": path.join(
          __dirname,
          "./tests/mocks/tanstack-start-mock.ts",
        ),
      },
    },
    test: {
      env: loadEnv("test", process.cwd(), "VITE_"),
      setupFiles: ["./tests/apply-migrations.ts"],
      include: ["src/**/*.integration.test.ts"],
      testTimeout: 50_000,
      hookTimeout: 50_000,
      teardownTimeout: 50_000,
      restoreMocks: true,
    },
  };
});
