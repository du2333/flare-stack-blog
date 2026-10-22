import {
  createAdminTestContext,
  createMockExecutionCtx,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as MomentsService from "./moments.service";

describe("MomentsService", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  beforeEach(() => {
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
  });

  it("creates a moment and returns it on the public list", async () => {
    const created = await MomentsService.createMoment(adminContext, {
      type: "moment",
      content: "  海边的风很凉。  ",
      images: ["/images/yozora/still.jpg"],
      location: "  镰仓  ",
      publishedAt: new Date(Date.now() - 1000),
    });

    expect(created.content).toBe("海边的风很凉。");
    expect(created.location).toBe("镰仓");
    expect(created.images).toEqual(["/images/yozora/still.jpg"]);

    const publicList = await MomentsService.getMoments(adminContext, {
      limit: 50,
    });

    expect(publicList.total).toBe(1);
    expect(publicList.items[0]?.content).toBe("海边的风很凉。");
  });

  it("does not expose drafts or future moments publicly", async () => {
    await MomentsService.createMoment(adminContext, {
      type: "chatter",
      content: "draft",
      images: [],
      publishedAt: null,
    });
    await MomentsService.createMoment(adminContext, {
      type: "moment",
      content: "future",
      images: [],
      publishedAt: new Date(Date.now() + 86_400_000),
    });

    const publicList = await MomentsService.getMoments(adminContext, {
      limit: 50,
    });
    expect(publicList.total).toBe(0);

    const adminList = await MomentsService.getAdminMoments(adminContext, {
      offset: 0,
      limit: 100,
    });
    expect(adminList.total).toBe(2);
  });

  it("updates a moment and invalidates the public list", async () => {
    const created = await MomentsService.createMoment(adminContext, {
      type: "moment",
      content: "before",
      images: [],
      publishedAt: new Date(Date.now() - 1000),
    });

    const updated = await MomentsService.updateMoment(adminContext, {
      id: created.id,
      content: "after",
      type: "chatter",
    });

    expect(updated.error).toBeNull();
    expect(updated.data?.content).toBe("after");
    expect(updated.data?.type).toBe("chatter");

    // New version key => must not return the stale "before" cache entry.
    const publicList = await MomentsService.getMoments(adminContext, {
      limit: 50,
    });
    expect(publicList.items[0]?.content).toBe("after");
  });

  it("soft-deletes a moment so it disappears from both lists", async () => {
    const created = await MomentsService.createMoment(adminContext, {
      type: "moment",
      content: "delete me",
      images: [],
      publishedAt: new Date(Date.now() - 1000),
    });

    const deleted = await MomentsService.deleteMoment(adminContext, {
      id: created.id,
    });
    expect(deleted.error).toBeNull();

    const publicList = await MomentsService.getMoments(adminContext, {
      limit: 50,
    });
    expect(publicList.total).toBe(0);

    const adminList = await MomentsService.getAdminMoments(adminContext, {
      offset: 0,
      limit: 100,
    });
    expect(adminList.total).toBe(0);
  });

  it("returns NOT_FOUND for missing updates and deletes", async () => {
    const update = await MomentsService.updateMoment(adminContext, {
      id: 999,
      content: "nope",
    });
    expect(update.error?.reason).toBe("NOT_FOUND");

    const remove = await MomentsService.deleteMoment(adminContext, {
      id: 999,
    });
    expect(remove.error?.reason).toBe("NOT_FOUND");
  });

  afterEach(async () => {
    await waitForBackgroundTasks(adminContext.executionCtx);
  });
});
