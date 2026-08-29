import { describe, expect, it } from "vitest";
import { hasWorkersCachePurge } from "./workers-cache";

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
