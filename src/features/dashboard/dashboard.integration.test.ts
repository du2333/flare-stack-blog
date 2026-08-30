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
import { getDashboardOverview } from "@/features/dashboard/service/dashboard.service";
import * as FriendLinkRepo from "@/features/friend-links/data/friend-links.data";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import * as PostService from "@/features/posts/services/posts.service";
import { PostsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

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
      "third",
      "second",
    ]);
  });

  it("caps pending friend links and reports the remainder", async () => {
    for (let i = 0; i < 7; i++) {
      await FriendLinkRepo.insertFriendLink(adminContext.db, {
        siteName: `Site ${i}`,
        siteUrl: `https://site-${i}.example`,
        contactEmail: `site-${i}@example.com`,
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

  it("includes pinnedAt on recent posts", async () => {
    const id = await publishPost("pinned-one");
    unwrap(
      await PostService.updatePost(adminContext, {
        id,
        data: { pinnedAt: new Date() },
      }),
    );

    const overview = await getDashboardOverview(adminContext);
    expect(
      overview.recentPosts.find((post) => post.id === id)?.pinnedAt,
    ).toBeTruthy();
  });

  it("lists visitor comments on published posts and skips the rest", async () => {
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

    const draftId = await PostService.createEmptyPost(adminContext).then(
      (post) => post.id,
    );
    unwrap(
      await PostService.updatePost(adminContext, {
        id: draftId,
        data: { title: "draft", slug: `draft-${draftId}` },
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
    expect(overview.recentComments.map((comment) => comment.snippet)).toEqual([
      "Still here",
    ]);
    expect(overview.recentComments[0]?.postSlug).toBe(`public-post-${postId}`);
  });

  it("surfaces a failed popularity sync", async () => {
    vi.spyOn(postPopularityService, "getStatus").mockResolvedValue({
      configured: true,
      expired: false,
      postCount: 0,
      lastAttemptAt: 1,
      lastSuccessAt: null,
      expiresAt: null,
      lastError: "umami 502",
      windowStart: null,
      windowEnd: null,
    });

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
