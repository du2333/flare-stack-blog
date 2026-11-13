import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CommentService from "@/features/comments/comments.service";
import type {
  PostPopularitySnapshot,
  PostPopularitySyncStatus,
} from "@/features/post-popularity/post-popularity.schema";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import * as PostService from "@/features/posts/services/posts.service";
import { PostsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

/**
 * The Admin list's two numbers per Post: published Comments and the views of
 * the last 30 days, and the sorts by each.
 */

function status(
  overrides: Partial<PostPopularitySyncStatus> = {},
): PostPopularitySyncStatus {
  return {
    configured: true,
    expired: false,
    postCount: 0,
    lastAttemptAt: 1,
    lastSuccessAt: 1,
    expiresAt: null,
    lastError: null,
    windowStart: null,
    windowEnd: null,
    ...overrides,
  };
}

function snapshot(
  entries: Array<{ postId: number; score: number }>,
): PostPopularitySnapshot {
  return {
    entries,
    windowStart: 0,
    windowEnd: 1,
    syncedAt: Date.now(),
    daily: [],
  };
}

function mockPopularity(
  popularityStatus: PostPopularitySyncStatus,
  popularitySnapshot: PostPopularitySnapshot | null,
) {
  vi.spyOn(postPopularityService, "getStatusWithSnapshot").mockResolvedValue({
    status: popularityStatus,
    snapshot: popularitySnapshot,
  });
}

describe("Admin post list metrics", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);
    const userSession = createMockSession({
      user: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: null,
      },
    });
    userContext = createAuthTestContext({ session: userSession });
    await seedUser(userContext.db, userSession.user);
    mockPopularity(status({ configured: false }), null);
  });

  async function createPost(title: string, publish: boolean) {
    const { id } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: { title, slug: `${title}-${id}` },
      }),
    );
    if (publish) unwrap(await PostService.publishPost(adminContext, { id }));
    return id;
  }

  async function comment(postId: number, content: string) {
    return unwrap(
      await CommentService.createComment(userContext, { postId, content }),
    );
  }

  const list = (input: Parameters<typeof PostService.listAdminPostsPage>[1]) =>
    PostService.listAdminPostsPage(adminContext, input);

  describe("commentCount", () => {
    it("counts the published Comments and replies of each Post, not deleted ones", async () => {
      const busy = await createPost("busy", true);
      const quiet = await createPost("quiet", true);
      const draft = await createPost("draft", false);
      const root = await comment(busy, "root");
      unwrap(
        await CommentService.createComment(userContext, {
          postId: busy,
          content: "reply",
          rootId: root.id,
          replyToCommentId: root.id,
        }),
      );
      const deleted = await comment(busy, "deleted");
      unwrap(
        await CommentService.deleteComment(userContext, { id: deleted.id }),
      );
      await comment(quiet, "one");

      const page = await list({});
      const counts = new Map(
        page.items.map((item) => [item.id, item.commentCount]),
      );
      expect(counts.get(busy)).toBe(2);
      expect(counts.get(quiet)).toBe(1);
      expect(counts.get(draft)).toBe(0);
    });

    it("is read only when asked for, so other readers of the Posts pay nothing for it", async () => {
      const id = await createPost("counted", true);
      await comment(id, "one");

      const plain = await PostService.getPosts(adminContext, {});
      expect(plain.map((row) => "commentCount" in row)).not.toContain(true);
      const asked = await PostService.getPosts(
        adminContext,
        {},
        { includeCommentCount: true },
      );
      expect(asked.find((row) => row.id === id)?.commentCount).toBe(1);
    });

    it("sorts by it in both directions, ties by id in that direction", async () => {
      const none = await createPost("none", true);
      const one = await createPost("one", true);
      const two = await createPost("two", true);
      const alsoOne = await createPost("also-one", true);
      await comment(one, "a");
      await comment(alsoOne, "b");
      await comment(two, "c");
      await comment(two, "d");

      const desc = await list({ sortBy: "commentCount", sortDir: "DESC" });
      expect(desc.items.map((item) => item.id)).toEqual([
        two,
        alsoOne,
        one,
        none,
      ]);
      const asc = await list({ sortBy: "commentCount", sortDir: "ASC" });
      expect(asc.items.map((item) => item.id)).toEqual([
        none,
        one,
        alsoOne,
        two,
      ]);
    });

    it("keeps paging stable and honours the filters while sorting by it", async () => {
      const first = await createPost("first", true);
      const second = await createPost("second", true);
      const draft = await createPost("draft", false);
      await comment(first, "a");
      await comment(second, "b");
      await comment(second, "c");

      const published = await list({
        sortBy: "commentCount",
        status: "published",
        limit: 1,
        offset: 0,
      });
      const next = await list({
        sortBy: "commentCount",
        status: "published",
        limit: 1,
        offset: 1,
      });
      expect(published.total).toBe(2);
      expect(published.items.map((item) => item.id)).toEqual([second]);
      expect(next.items.map((item) => item.id)).toEqual([first]);
      expect(draft).not.toBe(first);
    });
  });

  describe("viewCount", () => {
    it("is absent, with the reason, until popularity is ready", async () => {
      const id = await createPost("published", true);
      for (const [popularityStatus, popularitySnapshot, state] of [
        [status({ configured: false }), null, "unconfigured"],
        [status(), null, "missing"],
        [
          status({ expired: true }),
          snapshot([{ postId: id, score: 9 }]),
          "expired",
        ],
      ] as const) {
        mockPopularity(popularityStatus, popularitySnapshot);
        const page = await list({});
        expect(page.popularity).toBe(state);
        expect(page.items.every((item) => item.viewCount === undefined)).toBe(
          true,
        );
      }
    });

    it("carries the 30 day views of a published Post, 0 when the snapshot has none, nothing for a draft", async () => {
      const viewed = await createPost("viewed", true);
      const unseen = await createPost("unseen", true);
      const draft = await createPost("draft", false);
      mockPopularity(status(), snapshot([{ postId: viewed, score: 42 }]));

      const page = await list({});
      expect(page.popularity).toBe("ready");
      const views = new Map(
        page.items.map((item) => [item.id, item.viewCount]),
      );
      expect(views.get(viewed)).toBe(42);
      expect(views.get(unseen)).toBe(0);
      expect(views.has(draft)).toBe(true);
      expect(views.get(draft)).toBeUndefined();
    });

    it("sorts by it in both directions, drafts and unseen Posts last, ties by id", async () => {
      const low = await createPost("low", true);
      const high = await createPost("high", true);
      const unseen = await createPost("unseen", true);
      const draft = await createPost("draft", false);
      mockPopularity(
        status(),
        snapshot([
          { postId: high, score: 90 },
          { postId: low, score: 3 },
        ]),
      );

      const desc = await list({ sortBy: "viewCount", sortDir: "DESC" });
      expect(desc.items.map((item) => item.id)).toEqual([
        high,
        low,
        draft,
        unseen,
      ]);
      const asc = await list({ sortBy: "viewCount", sortDir: "ASC" });
      expect(asc.items.map((item) => item.id)).toEqual([
        unseen,
        draft,
        low,
        high,
      ]);
    });

    it("pages by views and keeps the filters, the total and the Category and Tags", async () => {
      const ids = [];
      for (const title of ["a", "b", "c", "d"])
        ids.push(await createPost(title, true));
      const draft = await createPost("draft", false);
      mockPopularity(
        status(),
        snapshot(ids.map((postId, index) => ({ postId, score: index + 1 }))),
      );

      const first = await list({
        sortBy: "viewCount",
        status: "published",
        limit: 3,
        offset: 0,
      });
      const second = await list({
        sortBy: "viewCount",
        status: "published",
        limit: 3,
        offset: 3,
      });
      expect(first.total).toBe(4);
      expect(first.items.map((item) => item.id)).toEqual([
        ids[3],
        ids[2],
        ids[1],
      ]);
      expect(second.items.map((item) => item.id)).toEqual([ids[0]]);
      expect(second.items[0]).toMatchObject({ tags: [], category: null });
      expect([...first.items, ...second.items].map((i) => i.id)).not.toContain(
        draft,
      );
    });

    it("falls back to the last edit while views are not ready", async () => {
      const older = await createPost("older", true);
      const newer = await createPost("newer", true);
      await adminContext.db
        .update(PostsTable)
        .set({ updatedAt: new Date(Date.now() + 5_000) })
        .where(eq(PostsTable.id, newer));

      const page = await list({ sortBy: "viewCount" });
      expect(page.popularity).toBe("unconfigured");
      expect(page.items.map((item) => item.id)).toEqual([newer, older]);
    });
  });
});
