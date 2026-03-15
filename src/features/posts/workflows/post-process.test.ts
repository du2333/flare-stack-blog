import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CacheService from "@/features/cache/cache.service";
import { POSTS_CACHE_KEYS } from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { calculatePostHash } from "@/features/posts/utils/sync";
import { PostProcessWorkflow } from "@/features/posts/workflows/post-process";
import { PostsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

describe("PostProcessWorkflow", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  const step: WorkflowStep = {
    do: (async (
      _name: string,
      configOrCallback: unknown,
      maybeCallback?: unknown,
    ) => {
      const callback =
        typeof configOrCallback === "function"
          ? configOrCallback
          : maybeCallback;
      return await (callback as () => Promise<unknown>)();
    }) as WorkflowStep["do"],
    sleep: (async () => undefined) as unknown as WorkflowStep["sleep"],
    sleepUntil: (async () =>
      undefined) as unknown as WorkflowStep["sleepUntil"],
    waitForEvent: (async () =>
      undefined) as unknown as WorkflowStep["waitForEvent"],
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    adminContext = createAdminTestContext({
      executionCtx: createMockExecutionCtx(),
    });
    await seedUser(adminContext.db, adminContext.session.user);
  });

  it("rebuilds missing public content even when the sync hash matches", async () => {
    const { id } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: {
          title: "Workflow Snapshot",
          slug: "workflow-snapshot",
          status: "published",
          summary: "already summarized",
          publishedAt: new Date(),
          contentJson: {
            type: "doc",
            content: [
              {
                type: "codeBlock",
                attrs: { language: "ts" },
                content: [{ type: "text", text: "const answer = 42;" }],
              },
            ],
          },
        },
      }),
    );

    const post = await adminContext.db.query.PostsTable.findFirst({
      where: eq(PostsTable.id, id),
      with: {
        postTags: {
          with: {
            tag: true,
          },
        },
      },
    });
    expect(post).not.toBeNull();
    const updatedAtBeforeRun = post!.updatedAt;

    await CacheService.set(
      { env: adminContext.env },
      POSTS_CACHE_KEYS.syncHash(id),
      await calculatePostHash({
        title: post!.title,
        contentJson: post!.contentJson,
        summary: post!.summary,
        tagIds: post!.postTags.map((pt) => pt.tag.id),
        slug: post!.slug,
        publishedAt: post!.publishedAt,
        readTimeInMinutes: post!.readTimeInMinutes,
      }),
    );

    const workflow = Object.assign(
      Object.create(PostProcessWorkflow.prototype),
      {
        env: adminContext.env,
      },
    ) as PostProcessWorkflow;

    await workflow.run(
      {
        payload: { postId: id, isPublished: true, isFuturePost: false },
      } as WorkflowEvent<{
        postId: number;
        isPublished: boolean;
        isFuturePost?: boolean;
      }>,
      step,
    );

    const updatedPost = await adminContext.db.query.PostsTable.findFirst({
      where: eq(PostsTable.id, id),
    });

    expect(updatedPost?.publicContentJson).toBeTruthy();
    expect(updatedPost?.updatedAt?.getTime()).toBe(
      updatedAtBeforeRun.getTime(),
    );
  });
});
