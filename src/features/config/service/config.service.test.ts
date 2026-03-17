import { createTestContext } from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as Invalidate from "@/lib/invalidate";
import * as ConfigService from "./config.service";

describe("ConfigService.updateSystemConfig", () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(async () => {
    context = createTestContext();
    await ConfigRepo.upsertSystemConfig(context.db, DEFAULT_CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("purges site CDN cache when site settings change", async () => {
    const purgeSiteCDNCacheSpy = vi
      .spyOn(Invalidate, "purgeSiteCDNCache")
      .mockResolvedValue();

    await ConfigService.updateSystemConfig(context, {
      ...DEFAULT_CONFIG,
      site: {
        ...DEFAULT_CONFIG.site,
        title: "Updated Site Title",
      },
    });

    expect(purgeSiteCDNCacheSpy).toHaveBeenCalledOnce();
    expect(purgeSiteCDNCacheSpy).toHaveBeenCalledWith(context.env);
  });

  it("does not purge site CDN cache when only non-site settings change", async () => {
    const purgeSiteCDNCacheSpy = vi
      .spyOn(Invalidate, "purgeSiteCDNCache")
      .mockResolvedValue();

    await ConfigService.updateSystemConfig(context, {
      ...DEFAULT_CONFIG,
      email: {
        ...DEFAULT_CONFIG.email,
        senderName: "Updated Sender",
      },
    });

    expect(purgeSiteCDNCacheSpy).not.toHaveBeenCalled();
  });
});
