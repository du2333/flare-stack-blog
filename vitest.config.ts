import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";

export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
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
      poolOptions: {
        workers: {
          singleWorker: true,
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
              ADMIN_EMAIL: "admin@example.com",
              GITHUB_CLIENT_ID: "test-id",
              GITHUB_CLIENT_SECRET: "test-secret",
              CLOUDFLARE_ZONE_ID: "test-zone",
              CLOUDFLARE_PURGE_API_TOKEN: "test-token",
              DOMAIN: "example.com",
              ENVIRONMENT: "test",
            },
          },
        },
      },
    },
  };
});
