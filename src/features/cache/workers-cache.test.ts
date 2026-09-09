import { describe, expect, it, vi } from "vitest";
import {
  applyWorkersCachePurge,
  hasWorkersCachePurge,
  purgeWorkersCache,
} from "./workers-cache";

describe("hasWorkersCachePurge", () => {
  it("is false when local Workers Caching has no purge API", () => {
    expect(hasWorkersCachePurge({})).toBe(false);
  });

  it("is true when purge exists", () => {
    expect(
      hasWorkersCachePurge({ purge: async () => ({ success: true }) }),
    ).toBe(true);
  });
});

describe("purgeWorkersCache", () => {
  it("purges through the App entrypoint, not the caller", async () => {
    const purgeCache = vi.fn(async () => undefined);
    await purgeWorkersCache(
      { exports: { App: { purgeCache } } },
      { tags: ["posts", "post:hello"] },
    );
    expect(purgeCache).toHaveBeenCalledWith({
      tags: ["posts", "post:hello"],
    });
  });
});

describe("applyWorkersCachePurge", () => {
  it("does nothing when purge is unavailable", async () => {
    await expect(
      applyWorkersCachePurge({}, { tags: ["posts"] }),
    ).resolves.toBeUndefined();
  });

  it("purges tags on the given cache", async () => {
    const purge = vi.fn(async () => ({ success: true, errors: [] }));
    await applyWorkersCachePurge({ purge }, { tags: ["posts"] });
    expect(purge).toHaveBeenCalledWith({ tags: ["posts"] });
  });

  it("fails when the purge is rejected", async () => {
    const purge = vi.fn(async () => ({
      success: false,
      errors: [{ code: 1, message: "rate limited" }],
    }));
    await expect(
      applyWorkersCachePurge({ purge }, { purgeEverything: true }),
    ).rejects.toThrow("workers cache purge failed");
  });
});
