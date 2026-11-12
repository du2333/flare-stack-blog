import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CommentService from "@/features/comments/comments.service";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import { DASHBOARD_RECENT_POSTS_LIMIT } from "@/features/dashboard/dashboard";
import {
  getDashboardOverview,
  listUnrepliedComments,
} from "@/features/dashboard/service/dashboard.service";
import * as FriendLinkRepo from "@/features/friend-links/data/friend-links.data";
import * as MutedUserService from "@/features/muted-users/service/muted-users.service";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import * as PostService from "@/features/posts/services/posts.service";
import * as kvStore from "@/features/cache/kv-store";
import { VERSION_CACHE_KEYS } from "@/features/version/version.schema";
import type {
  PostPopularitySnapshot,
  PostPopularitySyncStatus,
} from "@/features/post-popularity/post-popularity.schema";
import * as PostRevisionRepo from "@/features/posts/data/post-revisions.data";
import { CommentsTable, PostRevisionsTable, PostsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

function popularityStatus(
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

function mockPopularity(
  status: PostPopularitySyncStatus,
  snapshot: PostPopularitySnapshot | null,
) {
  vi.spyOn(postPopularityService, "getStatusWithSnapshot").mockResolvedValue({
    status,
    snapshot,
  });
}

describe("Dashboard overview", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;
  let userContext: ReturnType<typeof createAuthTestContext>;

  beforeEach(async () => {
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
    await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
  });

  async function publishPost(title: string) {
    const { id } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: { title, slug: `${title}-${id}` },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id }));
    return id;
  }

  it("lists the most recently updated posts", async () => {
    const first = await publishPost("first");
    await publishPost("second");
    await publishPost("third");
    await publishPost("fourth");
    unwrap(
      await PostService.updatePost(adminContext, {
        id: first,
        data: { title: "first-edited" },
      }),
    );
    await adminContext.db
      .update(PostsTable)
      .set({ updatedAt: new Date(Date.now() + 5_000) })
      .where(eq(PostsTable.id, first));

    const overview = await getDashboardOverview(adminContext);
    expect(overview.recentPosts.map((post) => post.title)).toEqual([
      "first-edited",
      "fourth",
      "third",
      "second",
    ]);
    expect(overview.latestDraft).toBeNull();
  });

  it("caps the recent posts at the limit", async () => {
    for (let i = 0; i < DASHBOARD_RECENT_POSTS_LIMIT + 2; i++)
      await publishPost(`post-${i}`);

    const overview = await getDashboardOverview(adminContext);
    expect(overview.recentPosts).toHaveLength(DASHBOARD_RECENT_POSTS_LIMIT);
  });

  it("offers the latest draft for continuing and lists it among the recent edits", async () => {
    await publishPost("published");
    const older = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id: older.id,
        data: { title: "older draft" },
      }),
    );
    const newer = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id: newer.id,
        data: { title: "newer draft" },
      }),
    );
    await adminContext.db
      .update(PostsTable)
      .set({ updatedAt: new Date(Date.now() + 5_000) })
      .where(eq(PostsTable.id, newer.id));

    const overview = await getDashboardOverview(adminContext);
    expect(overview.latestDraft).toMatchObject({
      id: newer.id,
      title: "newer draft",
      status: "draft",
    });
    expect(overview.recentPosts.map((post) => post.title)).toEqual([
      "newer draft",
      "older draft",
      "published",
    ]);
  });

  it("counts posts, public comments and friend links", async () => {
    const postId = await publishPost("counted");
    for (const title of ["first draft", "second draft"]) {
      const draft = await PostService.createEmptyPost(adminContext);
      unwrap(
        await PostService.updatePost(adminContext, {
          id: draft.id,
          data: { title },
        }),
      );
    }
    const old = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Old",
      }),
    );
    await adminContext.db
      .update(CommentsTable)
      .set({ createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
      .where(eq(CommentsTable.id, old.id));
    unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "New",
      }),
    );
    unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Admin",
      }),
    );
    const deleted = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Deleted",
      }),
    );
    unwrap(await CommentService.deleteComment(userContext, { id: deleted.id }));
    for (const [i, status] of (
      ["approved", "approved", "approved", "pending", "rejected"] as const
    ).entries()) {
      await FriendLinkRepo.insertFriendLink(adminContext.db, {
        siteName: `Site ${i}`,
        siteUrl: `https://count-${i}.example`,
        status,
        userId: userContext.session.user.id,
      });
    }

    const overview = await getDashboardOverview(adminContext);
    expect(overview.stats).toEqual({
      publishedPosts: 1,
      draftPosts: 2,
      comments: 3,
      recentComments: 2,
      approvedFriendLinks: 3,
      pendingFriendLinks: 1,
    });
  });

  it("caps pending friend links and reports the remainder", async () => {
    for (let i = 0; i < 7; i++) {
      await FriendLinkRepo.insertFriendLink(adminContext.db, {
        siteName: `Site ${i}`,
        siteUrl: `https://site-${i}.example`,
        status: "pending",
        userId: userContext.session.user.id,
      });
    }

    const overview = await getDashboardOverview(adminContext);
    expect(overview.pendingFriendLinks.items).toHaveLength(5);
    expect(overview.pendingFriendLinks.remainingCount).toBe(2);
    expect(overview.pendingFriendLinks.items[0]?.siteUrl).toMatch(
      /^https:\/\/site-\d+\.example$/,
    );
  });

  it("counts writing events per UTC hour inside the calendar window", async () => {
    const HOUR_MS = 60 * 60 * 1000;
    const postId = await publishPost("written");
    const hour = Math.floor(Date.now() / HOUR_MS) - 48;
    const at = (h: number, minute: number) =>
      new Date(h * HOUR_MS + minute * 60_000);
    const { db } = adminContext;
    await db
      .update(PostsTable)
      .set({ createdAt: at(hour, 5) })
      .where(eq(PostsTable.id, postId));
    const published = await db
      .update(PostRevisionsTable)
      .set({ createdAt: at(hour, 40) })
      .where(eq(PostRevisionsTable.postId, postId))
      .returning({ id: PostRevisionsTable.id });
    expect(published.length).toBeGreaterThan(0);
    const [revision] = await db.select().from(PostRevisionsTable).limit(1);
    if (!revision) throw new Error("expected the publish revision");
    for (const createdAt of [
      at(hour + 3, 20),
      new Date(Date.now() - 200 * 24 * HOUR_MS),
    ]) {
      const extra = await PostRevisionRepo.insertPostRevision(db, {
        postId,
        reason: "auto",
        snapshotJson: revision.snapshotJson,
        snapshotHash: `${revision.snapshotHash}-${createdAt.getTime()}`,
      });
      await db
        .update(PostRevisionsTable)
        .set({ createdAt })
        .where(eq(PostRevisionsTable.id, extra.id));
    }

    const overview = await getDashboardOverview(adminContext);
    expect(overview.writingActivity).toEqual([
      { hour, count: 1 + published.length },
      { hour: hour + 3, count: 1 },
    ]);
  });

  it("includes pinnedAt on recent posts", async () => {
    const id = await publishPost("pinned-one");
    unwrap(await PostService.pinPost(adminContext, { id }));

    const overview = await getDashboardOverview(adminContext);
    expect(
      overview.recentPosts.find((post) => post.id === id)?.pinnedAt,
    ).toBeTruthy();
  });

  it("marks recent published posts with Unpublished Changes", async () => {
    const changed = await publishPost("changed-after-publish");
    const unchanged = await publishPost("unchanged-after-publish");
    unwrap(
      await PostService.updatePost(adminContext, {
        id: changed,
        data: { title: "changed after publish, edited" },
      }),
    );

    const overview = await getDashboardOverview(adminContext);
    const flag = (id: number) =>
      overview.recentPosts.find((post) => post.id === id)
        ?.hasUnpublishedChanges;
    expect(flag(changed)).toBe(true);
    expect(flag(unchanged)).toBe(false);
  });

  it("lists unreplied visitor comments on public posts and skips the rest", async () => {
    const postId = await publishPost("public-post");
    unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Admin note",
      }),
    );
    const visitorComment = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Visitor hello",
      }),
    );
    unwrap(
      await CommentService.deleteComment(userContext, {
        id: visitorComment.id,
      }),
    );
    unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Still here",
      }),
    );

    const unpublishedId = await publishPost("gone");
    unwrap(
      await CommentService.createComment(userContext, {
        postId: unpublishedId,
        content: "Before unpublish",
      }),
    );
    unwrap(
      await PostService.unpublishPost(adminContext, { id: unpublishedId }),
    );

    const overview = await getDashboardOverview(adminContext);
    expect(
      overview.unrepliedComments.items.map((comment) => comment.snippet),
    ).toEqual(["Still here"]);
    expect(overview.unrepliedComments.total).toBe(1);
    expect(overview.unrepliedComments.items[0]?.postSlug).toBe(
      `public-post-${postId}`,
    );
  });

  it("drops a comment once an Admin replies to it", async () => {
    const postId = await publishPost("replies");
    const answered = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Answered root",
      }),
    );
    const open = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Open root",
      }),
    );
    const followUp = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Follow-up",
        rootId: open.id,
        replyToCommentId: open.id,
      }),
    );
    const legacy = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Legacy root",
      }),
    );
    const retracted = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Reply retracted",
      }),
    );

    unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Thanks",
        rootId: answered.id,
        replyToCommentId: answered.id,
      }),
    );
    // Answering the follow-up leaves its root waiting.
    unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "On the follow-up",
        rootId: open.id,
        replyToCommentId: followUp.id,
      }),
    );
    // A thread reply written before reply targets existed.
    const legacyReply = unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Old-style reply",
        rootId: legacy.id,
      }),
    );
    await adminContext.db
      .update(CommentsTable)
      .set({ replyToCommentId: null })
      .where(eq(CommentsTable.id, legacyReply.id));
    const deletedReply = unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Never mind",
        rootId: retracted.id,
        replyToCommentId: retracted.id,
      }),
    );
    unwrap(
      await CommentService.deleteComment(adminContext, { id: deletedReply.id }),
    );
    // A legacy reply leaves no handled mark; the thread alone answers it.
    await adminContext.db
      .update(CommentsTable)
      .set({ handledAt: null })
      .where(eq(CommentsTable.id, legacy.id));

    // The reply marked its target handled, so deleting it changes nothing.
    const overview = await getDashboardOverview(adminContext);
    expect(
      overview.unrepliedComments.items.map((comment) => comment.id),
    ).toEqual([open.id]);
    expect(overview.unrepliedComments.total).toBe(1);
  });

  it("caps unreplied comments at five, newest first, with the total", async () => {
    const postId = await publishPost("busy");
    const ids: Array<number> = [];
    for (let i = 0; i < 7; i++) {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: `Comment ${i}`,
        }),
      );
      await adminContext.db
        .update(CommentsTable)
        .set({ createdAt: new Date(Date.now() + i * 1_000) })
        .where(eq(CommentsTable.id, comment.id));
      ids.push(comment.id);
    }

    const overview = await getDashboardOverview(adminContext);
    expect(overview.unrepliedComments.total).toBe(7);
    expect(
      overview.unrepliedComments.items.map((comment) => comment.id),
    ).toEqual(ids.slice(2).reverse());
  });

  it("carries what the Admin needs to reply to, delete or mute a comment", async () => {
    const postId = await publishPost("actions-post");
    const root = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Root",
      }),
    );
    const reply = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Reply",
        rootId: root.id,
        replyToCommentId: root.id,
      }),
    );

    let overview = await getDashboardOverview(adminContext);
    expect(overview.unrepliedComments.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: root.id,
          postId,
          rootId: null,
          userId: "user-1",
          userMuted: false,
        }),
        expect.objectContaining({ id: reply.id, postId, rootId: root.id }),
      ]),
    );

    unwrap(await MutedUserService.muteUser(adminContext, { userId: "user-1" }));
    overview = await getDashboardOverview(adminContext);
    expect(
      overview.unrepliedComments.items.every((comment) => comment.userMuted),
    ).toBe(true);
  });

  it("drops handled comments from the unreplied list and count", async () => {
    const postId = await publishPost("handled");
    const thanks = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "谢谢up主",
      }),
    );
    const question = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "A real question",
      }),
    );
    const answered = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "Answered then retracted",
      }),
    );

    unwrap(await CommentService.markCommentHandled(adminContext, thanks));
    // The reply handles the comment, so deleting it does not bring it back.
    const reply = unwrap(
      await CommentService.createComment(adminContext, {
        postId,
        content: "Answer",
        rootId: answered.id,
        replyToCommentId: answered.id,
      }),
    );
    unwrap(await CommentService.deleteComment(adminContext, { id: reply.id }));

    let overview = await getDashboardOverview(adminContext);
    expect(
      overview.unrepliedComments.items.map((comment) => comment.id),
    ).toEqual([question.id]);
    expect(overview.unrepliedComments.total).toBe(1);

    unwrap(await CommentService.unmarkCommentHandled(adminContext, thanks));
    overview = await getDashboardOverview(adminContext);
    expect(overview.unrepliedComments.total).toBe(2);

    expect(
      await CommentService.markAllUnrepliedCommentsHandled(adminContext),
    ).toEqual({ count: 2 });
    overview = await getDashboardOverview(adminContext);
    expect(overview.unrepliedComments.items).toEqual([]);
    expect(overview.unrepliedComments.total).toBe(0);
  });

  it("pages through every unreplied comment, stable while comments leave", async () => {
    const postId = await publishPost("paged");
    const ids: Array<number> = [];
    for (let i = 0; i < 5; i++) {
      const comment = unwrap(
        await CommentService.createComment(userContext, {
          postId,
          content: `Comment ${i}`,
        }),
      );
      // Two share a second, so the id breaks the tie.
      await adminContext.db
        .update(CommentsTable)
        .set({ createdAt: new Date(Date.now() + Math.min(i, 3) * 1_000) })
        .where(eq(CommentsTable.id, comment.id));
      ids.push(comment.id);
    }
    const newestFirst = [...ids].reverse();

    const first = await listUnrepliedComments(adminContext, { limit: 2 });
    expect(first.items.map((comment) => comment.id)).toEqual(
      newestFirst.slice(0, 2),
    );
    expect(first.total).toBe(5);
    expect(first.nextBeforeId).toBe(newestFirst[1]);

    // Handling a Comment already shown does not shift the next page.
    unwrap(
      await CommentService.markCommentHandled(adminContext, {
        id: newestFirst[0],
      }),
    );
    const second = await listUnrepliedComments(adminContext, {
      limit: 2,
      beforeId: first.nextBeforeId ?? undefined,
    });
    expect(second.items.map((comment) => comment.id)).toEqual(
      newestFirst.slice(2, 4),
    );
    expect(second.total).toBe(4);

    const last = await listUnrepliedComments(adminContext, {
      limit: 2,
      beforeId: second.nextBeforeId ?? undefined,
    });
    expect(last.items.map((comment) => comment.id)).toEqual([newestFirst[4]]);
    expect(last.nextBeforeId).toBeNull();
  });

  it("ranks the most viewed public posts from the popularity snapshot", async () => {
    const ids: Array<number> = [];
    for (const title of [
      "alpha",
      "beta",
      "gamma",
      "delta",
      "epsilon",
      "zeta",
    ]) {
      ids.push(await publishPost(title));
    }
    const [alpha, beta, gamma, delta, epsilon, zeta] = ids as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const hidden = await publishPost("hidden");
    unwrap(await PostService.unpublishPost(adminContext, { id: hidden }));
    mockPopularity(popularityStatus(), {
      entries: [
        { postId: hidden, score: 5_000 },
        { postId: gamma, score: 1_200 },
        { postId: alpha, score: 900 },
        { postId: zeta, score: 300 },
        { postId: beta, score: 120 },
        { postId: delta, score: 40 },
        { postId: epsilon, score: 2 },
      ],
      windowStart: 1_000,
      windowEnd: 2_000,
      syncedAt: Date.now(),
    });

    const overview = await getDashboardOverview(adminContext);
    expect(overview.popularity).toMatchObject({
      state: "ready",
      windowStart: 1_000,
      windowEnd: 2_000,
      totalViews: 7_562,
    });
    expect(
      overview.popularity.topPosts.map((post) => [post.title, post.views]),
    ).toEqual([
      ["gamma", 1_200],
      ["alpha", 900],
      ["zeta", 300],
      ["beta", 120],
      ["delta", 40],
    ]);
    expect(overview.popularity.topPosts[0]?.slug).toBe(`gamma-${gamma}`);
  });

  it("keeps an expired snapshot visible and marks it", async () => {
    const postId = await publishPost("stale");
    mockPopularity(popularityStatus({ expired: true }), {
      entries: [{ postId, score: 10 }],
      windowStart: 1,
      windowEnd: 2,
      syncedAt: 0,
    });

    const overview = await getDashboardOverview(adminContext);
    expect(overview.popularity.state).toBe("expired");
    expect(overview.popularity.totalViews).toBe(10);
    expect(overview.popularityAlert).toBe("expired");
  });

  it("reports no traffic without Umami or a snapshot", async () => {
    mockPopularity(popularityStatus({ configured: false }), null);
    let overview = await getDashboardOverview(adminContext);
    expect(overview.popularity).toEqual({
      state: "unconfigured",
      windowStart: null,
      windowEnd: null,
      totalViews: 0,
      topPosts: [],
    });

    mockPopularity(popularityStatus(), null);
    overview = await getDashboardOverview(adminContext);
    expect(overview.popularity.state).toBe("missing");
  });

  it("announces a newer release only from the cached version check", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    let overview = await getDashboardOverview(adminContext);
    expect(overview.update).toBeNull();

    await kvStore.put(
      adminContext,
      VERSION_CACHE_KEYS.latestRelease,
      JSON.stringify({
        version: "v99.0.0",
        releaseUrl:
          "https://github.com/du2333/flare-stack-blog/releases/tag/v99.0.0",
      }),
    );
    overview = await getDashboardOverview(adminContext);
    expect(overview.update).toEqual({
      latestVersion: "v99.0.0",
      releaseUrl:
        "https://github.com/du2333/flare-stack-blog/releases/tag/v99.0.0",
    });

    await kvStore.put(
      adminContext,
      VERSION_CACHE_KEYS.latestRelease,
      JSON.stringify({
        version: `v${__APP_VERSION__}`,
        releaseUrl: `https://github.com/du2333/flare-stack-blog/releases/tag/v${__APP_VERSION__}`,
      }),
    );
    overview = await getDashboardOverview(adminContext);
    expect(overview.update).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await kvStore.remove(adminContext, VERSION_CACHE_KEYS.latestRelease);
  });

  it("surfaces a failed popularity sync", async () => {
    mockPopularity(
      popularityStatus({ lastSuccessAt: null, lastError: "umami 502" }),
      null,
    );

    const overview = await getDashboardOverview(adminContext);
    expect(overview.popularityAlert).toBe("failed");
  });

  it("surfaces default site identity and missing admin email", async () => {
    const overview = await getDashboardOverview(adminContext);
    expect(overview.adminEmailNeedsSetup).toBe(true);
    expect(overview.defaultSiteIdentity).toBe(true);
  });

  it("clears setup flags after email and site identity are set", async () => {
    await ConfigRepo.upsertSystemConfig(adminContext.db, {
      ...DEFAULT_CONFIG,
      email: {
        host: "smtp.example.com",
        port: 465,
        username: "blog",
        password: "secret",
        senderAddress: "blog@example.com",
      },
      site: {
        ...DEFAULT_CONFIG.site,
        title: "冷静的阿矿",
        author: "阿矿",
      },
    });

    const overview = await getDashboardOverview(adminContext);
    expect(overview.adminEmailNeedsSetup).toBe(false);
    expect(overview.defaultSiteIdentity).toBe(false);
  });
});
