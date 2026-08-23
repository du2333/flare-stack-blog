import { applyD1Migrations, reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, vi } from "vitest";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import { drainTestExecutionContexts } from "./test-utils";

vi.mock("@/features/cache/workers-cache", () => ({
  purgeWorkersCache: vi.fn(async () => undefined),
}));

// Setup files run outside per-test-file storage isolation. Cloudflare's
// applyD1Migrations() only applies migrations that have not already run.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  vi.mocked(purgeWorkersCache).mockResolvedValue(undefined);
});

afterEach(async () => {
  await drainTestExecutionContexts();
  await reset();
});
