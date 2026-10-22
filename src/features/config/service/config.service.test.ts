import { describe, expect, it, vi } from "vitest";

/**
 * C2 regression: feature flags are build-time config, but they still have to
 * survive resolveSiteConfig's FullSiteConfigSchema.parse() step. Before this
 * test existed, the resolver omitted `features`, so every flag silently fell
 * back to false even when blog.config.ts enabled it.
 */
vi.mock("@/blog.config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/blog.config")>();
  return {
    blogConfig: {
      ...actual.blogConfig,
      features: {
        moments: true,
        library: false,
        about: true,
      },
    },
  };
});

import { resolveSiteConfig } from "./config.service";

describe("resolveSiteConfig feature flags", () => {
  it("preserves build-time feature flags after schema parsing", () => {
    const siteConfig = resolveSiteConfig(undefined);

    expect(siteConfig.features).toEqual({
      moments: true,
      library: false,
      about: true,
    });
  });

  it("keeps flags stable when a partial system config is provided", () => {
    const siteConfig = resolveSiteConfig({
      site: {
        title: "Feature flag test",
      },
    });

    expect(siteConfig.title).toBe("Feature flag test");
    expect(siteConfig.features).toEqual({
      moments: true,
      library: false,
      about: true,
    });
  });
});
