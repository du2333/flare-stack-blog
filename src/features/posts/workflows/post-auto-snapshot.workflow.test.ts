import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import { PostAutoSnapshotWorkflow } from "@/features/posts/workflows/post-auto-snapshot";
import * as TagService from "@/features/tags/tags.service";
import { type Duration, ms } from "@/lib/duration";
import { unwrap } from "@/lib/errors";

function toMsDurationLabel(duration: string): Duration {
  const normalized = duration
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m");
  return normalized as Duration;
}

describe("PostAutoSnapshotWorkflow", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  const stepDo: WorkflowStep["do"] = (async (
    _name: string,
    configOrCallback: unknown,
    maybeCallback?: unknown,
  ) => {
    const callback =
      typeof configOrCallback === "function" ? configOrCallback : maybeCallback;
    return await (callback as () => Promise<unknown>)();
  }) as WorkflowStep["do"];

  const noopStep: WorkflowStep = {
    do: stepDo,
    sleep: (async () => undefined) as WorkflowStep["sleep"],
    sleepUntil: (async () =>
      undefined) as unknown as WorkflowStep["sleepUntil"],
    waitForEvent: (async () =>
      undefined) as unknown as WorkflowStep["waitForEvent"],
  };

  function createTimerStep(
    onSleep?: (sleepCalls: number) => Promise<void> | void,
  ): WorkflowStep {
    let sleepCalls = 0;

    return {
      do: stepDo,
      sleep: (async (_name: string, duration: number | string) => {
        const durationMs =
          typeof duration === "number"
            ? duration
            : ms(toMsDurationLabel(duration));

        vi.advanceTimersByTime(durationMs);
        sleepCalls += 1;
        await onSleep?.(sleepCalls);
      }) as WorkflowStep["sleep"],
      sleepUntil: noopStep.sleepUntil,
      waitForEvent: noopStep.waitForEvent,
    };
  }

  beforeEach(async () => {
    vi.restoreAllMocks();
    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const updatePost = async (
    input: Parameters<typeof PostService.updatePost>[1],
  ) => unwrap(await PostService.updatePost(adminContext, input));

  const createWorkflow = () =>
    Object.assign(Object.create(PostAutoSnapshotWorkflow.prototype), {
      env: adminContext.env,
    }) as PostAutoSnapshotWorkflow;

  it("enqueues an auto snapshot when a post is updated", async () => {
    vi.mocked(adminContext.env.QUEUE.send).mockClear();
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Queued Update",
        slug: "queued-update",
      },
    });
    await waitForBackgroundTasks(adminContext.executionCtx);

    expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith({
      type: "POST_AUTO_SNAPSHOT",
      data: {
        postId: id,
        quietWindowSeconds: 30,
      },
    });
  });

  it("throttles duplicate auto snapshot queue messages for the same post", async () => {
    vi.mocked(adminContext.env.QUEUE.send).mockClear();
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Throttle Once",
        slug: "throttle-once",
      },
    });
    await waitForBackgroundTasks(adminContext.executionCtx);

    await updatePost({
      id,
      data: {
        title: "Throttle Twice",
        slug: "throttle-twice",
      },
    });
    await waitForBackgroundTasks(adminContext.executionCtx);

    expect(adminContext.env.QUEUE.send).toHaveBeenCalledTimes(1);
  });

  it("enqueues an auto snapshot when post tags change", async () => {
    vi.mocked(adminContext.env.QUEUE.send).mockClear();
    const tag = unwrap(
      await TagService.createTag(adminContext, { name: "queue-tag" }),
    );
    const { id } = await PostService.createEmptyPost(adminContext);

    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [tag.id],
    });

    expect(adminContext.env.QUEUE.send).toHaveBeenCalledWith({
      type: "POST_AUTO_SNAPSHOT",
      data: {
        postId: id,
        quietWindowSeconds: 30,
      },
    });
  });

  it("creates an auto revision after the quiet window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T10:00:00.000Z"));

    const tag = unwrap(
      await TagService.createTag(adminContext, { name: "auto-workflow-tag" }),
    );
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Workflow Auto Revision",
        slug: "workflow-auto-revision",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Snapshot after quiet window" }],
            },
          ],
        },
      },
    });
    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [tag.id],
    });

    await createWorkflow().run(
      {
        payload: { postId: id, quietWindowSeconds: 5 },
      } as WorkflowEvent<{ postId: number; quietWindowSeconds?: number }>,
      createTimerStep(),
    );

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.reason).toBe("auto");
  });

  it("waits for the latest edit before creating an auto revision", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T10:00:00.000Z"));

    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Quiet Window Reset",
        slug: "quiet-window-reset",
      },
    });

    let sleepCalls = 0;
    const quietStep = createTimerStep(async (calls) => {
      sleepCalls = calls;
      if (sleepCalls === 1) {
        await updatePost({
          id,
          data: {
            title: "Quiet Window Reset Again",
          },
        });
      }
    });

    await createWorkflow().run(
      {
        payload: { postId: id, quietWindowSeconds: 5 },
      } as WorkflowEvent<{ postId: number; quietWindowSeconds?: number }>,
      quietStep,
    );

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.title).toBe("Quiet Window Reset Again");
    expect(sleepCalls).toBeGreaterThan(1);
  });

  it("skips creating a duplicate auto revision when nothing changed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T10:00:00.000Z"));

    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "No Change Auto Revision",
        slug: "no-change-auto-revision",
      },
    });

    unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
        reason: "auto",
      }),
    );

    await createWorkflow().run(
      {
        payload: { postId: id, quietWindowSeconds: 5 },
      } as WorkflowEvent<{ postId: number; quietWindowSeconds?: number }>,
      createTimerStep(),
    );

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );
    expect(revisions).toHaveLength(1);
  }, 15000);
});
