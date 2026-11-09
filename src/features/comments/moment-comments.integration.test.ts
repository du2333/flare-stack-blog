import { env } from "cloudflare:workers";
import { seedSystemConfig } from "tests/config-fixture";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  createTestContext,
  seedUser,
} from "tests/test-utils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import * as CommentService from "@/features/comments/comments.service";
import * as CommentRepo from "@/features/comments/data/comments.data";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import * as MediaRepo from "@/features/media/data/media.data";
import * as MomentService from "@/features/moments/services/moments.service";
import * as MutedUserService from "@/features/muted-users/service/muted-users.service";
import * as PostService from "@/features/posts/services/posts.service";
import { serverEnv } from "@/lib/env/server.env";
import { CommentsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";
import { m } from "@/paraglide/messages";

/** Comments on Moments follow every Comment rule (ADR 0037). */

const LONG_TEXT =
  "今天去看了海，风很大，浪一层一层地推过来，像是有人在远处不停地翻书页，一直翻到天黑才回家。";

let adminContext: ReturnType<typeof createAdminTestContext>;
let userContext: ReturnType<typeof createAuthTestContext>;
let otherContext: ReturnType<typeof createAuthTestContext>;

type QueuedMessage = {
  type: string;
  data: {
    to?: string;
    subject?: string;
    html?: string;
    event?: { type: string; data: Record<string, unknown> };
  };
};

function queued() {
  return vi
    .mocked(userContext.env.QUEUE.send)
    .mock.calls.map(([message]) => message as QueuedMessage);
}

/** Whether an error, or one it was caused by, is a failed CHECK. */
function isCheckFailure(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (/CHECK constraint failed/i.test(current.message)) return true;
  }
  return false;
}

async function postMoment(
  input: Parameters<typeof MomentService.createMoment>[1],
) {
  return unwrap(await MomentService.createMoment(adminContext, input));
}

beforeEach(async () => {
  adminContext = createAdminTestContext({
    executionCtx: createMockExecutionCtx(),
  });
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

  const otherSession = createMockSession({
    user: {
      id: "user-2",
      name: "Other User",
      email: "other@example.com",
      role: null,
    },
  });
  otherContext = createAuthTestContext({ session: otherSession });
  await seedUser(otherContext.db, otherSession.user);

  await ConfigRepo.upsertSystemConfig(adminContext.db, DEFAULT_CONFIG);
});

describe("comments on a Moment", () => {
  it("are created on any existing Moment, with replies in its thread", async () => {
    const moment = await postMoment({ text: "hello" });

    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Nice!",
      }),
    );
    expect(root).toMatchObject({
      momentId: moment.id,
      postId: null,
      rootId: null,
      status: "published",
    });

    const reply = unwrap(
      await CommentService.createComment(otherContext, {
        momentId: moment.id,
        content: "Agreed",
        rootId: root.id,
      }),
    );
    expect(reply).toMatchObject({
      momentId: moment.id,
      rootId: root.id,
      replyToCommentId: root.id,
    });

    const roots = await CommentService.getRootComments(createTestContext(), {
      momentId: moment.id,
    });
    expect(roots.total).toBe(2);
    expect(roots.items.map((item) => item.id)).toEqual([root.id]);
    expect(roots.items[0]).toMatchObject({
      replyCount: 1,
      momentId: moment.id,
    });
    expect(roots.items[0].replies.map((item) => item.id)).toEqual([reply.id]);

    const replies = await CommentService.getRepliesByRootId(
      createTestContext(),
      { momentId: moment.id, rootId: root.id },
    );
    expect(replies.total).toBe(1);
    expect(replies.items[0]).toMatchObject({
      id: reply.id,
      replyTo: { id: "user-1", name: "Test User" },
    });
  });

  it("refuses a Moment that does not exist", async () => {
    const result = await CommentService.createComment(userContext, {
      momentId: 999_999,
      content: "Anyone?",
    });
    expect(result.error?.reason).toBe("MOMENT_NOT_FOUND");

    expect(
      await CommentService.getRootComments(createTestContext(), {
        momentId: 999_999,
      }),
    ).toEqual({ items: [], total: 0, viewerMuted: false });
  });

  it("keeps threads apart from a Post's, by id alone", async () => {
    const moment = await postMoment({ text: "moment" });
    const { id: postId } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id: postId,
        data: { title: "A Post", slug: `a-post-${Date.now()}` },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id: postId }));

    const onPost = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "On the Post",
      }),
    );
    const onMoment = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "On the Moment",
      }),
    );

    // A reply must stay on its root's Post or Moment.
    const crossed = await CommentService.createComment(userContext, {
      momentId: moment.id,
      content: "Wrong thread",
      rootId: onPost.id,
    });
    expect(crossed.error?.reason).toBe("ROOT_COMMENT_POST_MISMATCH");

    // A thread is loaded only on the page its Comment is on.
    expect(
      (
        await CommentService.getThreadByCommentId(createTestContext(), {
          postId,
          id: onMoment.id,
        })
      ).error?.reason,
    ).toBe("COMMENT_NOT_FOUND");
    expect(
      (
        await CommentService.getRepliesByRootId(createTestContext(), {
          momentId: moment.id,
          rootId: onPost.id,
        })
      ).total,
    ).toBe(0);

    const postRoots = await CommentService.getRootComments(
      createTestContext(),
      { postId },
    );
    expect(postRoots.items.map((item) => item.id)).toEqual([onPost.id]);
    expect(postRoots.total).toBe(1);
  });

  it("load a thread by a reply's id, and keep deleted Comments as placeholders", async () => {
    const moment = await postMoment({ text: "thread" });
    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Root",
      }),
    );
    const reply = unwrap(
      await CommentService.createComment(otherContext, {
        momentId: moment.id,
        content: "Reply",
        rootId: root.id,
      }),
    );

    const thread = unwrap(
      await CommentService.getThreadByCommentId(createTestContext(), {
        momentId: moment.id,
        id: reply.id,
      }),
    );
    expect(thread.id).toBe(root.id);
    expect(thread.replies.map((item) => item.id)).toEqual([reply.id]);

    // A deleted root with a published reply stays as a placeholder.
    unwrap(await CommentService.deleteComment(userContext, { id: root.id }));
    const withPlaceholder = await CommentService.getRootComments(
      createTestContext(),
      { momentId: moment.id },
    );
    expect(withPlaceholder.items).toHaveLength(1);
    expect(withPlaceholder.items[0].status).toBe("deleted");
    expect(withPlaceholder.total).toBe(1);

    // With its last reply deleted too, the thread is gone.
    unwrap(await CommentService.deleteComment(otherContext, { id: reply.id }));
    const empty = await CommentService.getRootComments(createTestContext(), {
      momentId: moment.id,
    });
    expect(empty).toMatchObject({ items: [], total: 0 });
    expect(
      (
        await CommentService.getThreadByCommentId(createTestContext(), {
          momentId: moment.id,
          id: reply.id,
        })
      ).error?.reason,
    ).toBe("COMMENT_NOT_FOUND");
  });

  it("refuse a Muted User, who sees that they are muted", async () => {
    const moment = await postMoment({ text: "quiet" });
    unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Before muting",
      }),
    );
    unwrap(await MutedUserService.muteUser(adminContext, { userId: "user-1" }));

    const refused = await CommentService.createComment(userContext, {
      momentId: moment.id,
      content: "After muting",
    });
    expect(refused.error?.reason).toBe("USER_MUTED");

    const roots = await CommentService.getRootComments(userContext, {
      momentId: moment.id,
    });
    expect(roots.viewerMuted).toBe(true);
    expect(roots.items[0].user?.mutedAt).toBeInstanceOf(Date);
  });

  it("are deleted with their Moment", async () => {
    const moment = await postMoment({ text: "short-lived" });
    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Root",
      }),
    );
    unwrap(
      await CommentService.createComment(otherContext, {
        momentId: moment.id,
        content: "Reply",
        rootId: root.id,
      }),
    );

    unwrap(await MomentService.deleteMoment(adminContext, { id: moment.id }));

    const left = await adminContext.db
      .select({ id: CommentsTable.id })
      .from(CommentsTable)
      .where(eq(CommentsTable.momentId, moment.id));
    expect(left).toEqual([]);
  });
});

describe("a Comment's target", () => {
  it("is exactly one Post or one Moment, which the database enforces", async () => {
    const moment = await postMoment({ text: "check" });
    const { id: postId } = await PostService.createEmptyPost(adminContext);

    await expect(
      CommentRepo.insertComment(adminContext.db, {
        content: "Both",
        postId,
        momentId: moment.id,
        status: "published",
      }),
    ).rejects.toSatisfy(isCheckFailure);
    await expect(
      CommentRepo.insertComment(adminContext.db, {
        content: "Neither",
        status: "published",
      }),
    ).rejects.toSatisfy(isCheckFailure);
  });
});

describe("a Moment's comment count", () => {
  it("counts published Comments, and its cached Moment follows creates and deletes", async () => {
    const moment = await postMoment({ text: "counted" });
    const reader = createTestContext();

    // Read once so the list, page and sidebar entries are cached.
    expect(
      (await MomentService.getMomentById(reader, moment.id))?.commentCount,
    ).toBe(0);
    expect(
      (await MomentService.getMomentsPage(reader, 1)).items[0].commentCount,
    ).toBe(0);
    expect((await MomentService.getLatestMoments(reader))[0].commentCount).toBe(
      0,
    );

    vi.mocked(purgeWorkersCache).mockClear();
    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "One",
      }),
    );
    unwrap(
      await CommentService.createComment(otherContext, {
        momentId: moment.id,
        content: "Two",
        rootId: root.id,
      }),
    );
    // The Moment's page and the Moments lists carry the count.
    expect(purgeWorkersCache).toHaveBeenCalledWith(expect.anything(), {
      tags: ["moments", `moment:${moment.id}`],
    });

    expect(
      (await MomentService.getMomentById(reader, moment.id))?.commentCount,
    ).toBe(2);
    expect(
      (await MomentService.getMomentsPage(reader, 1)).items[0].commentCount,
    ).toBe(2);
    expect((await MomentService.getLatestMoments(reader))[0].commentCount).toBe(
      2,
    );

    unwrap(await CommentService.deleteComment(userContext, { id: root.id }));
    expect(
      (await MomentService.getMomentById(reader, moment.id))?.commentCount,
    ).toBe(1);
    expect(
      (await MomentService.getMomentsPage(reader, 1)).items[0].commentCount,
    ).toBe(1);
  });

  it("does not purge a Moment's caches for a Post's Comment", async () => {
    const { id: postId } = await PostService.createEmptyPost(adminContext);
    unwrap(
      await PostService.updatePost(adminContext, {
        id: postId,
        data: { title: "A Post", slug: `count-post-${Date.now()}` },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id: postId }));
    vi.mocked(purgeWorkersCache).mockClear();

    unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "On a Post",
      }),
    );
    expect(purgeWorkersCache).not.toHaveBeenCalled();
  });
});

describe("notifications for a Moment's comments", () => {
  async function enableWebhook() {
    await seedSystemConfig(adminContext, {
      ...DEFAULT_CONFIG,
      notification: {
        ...DEFAULT_CONFIG.notification,
        admin: { channels: { email: true } },
        webhook: { url: "https://example.com/webhook", secret: "secret" },
      },
    });
  }

  it("tell the Admin of a new root comment, naming the Moment by its first words", async () => {
    await enableWebhook();
    const moment = await postMoment({ text: LONG_TEXT });
    vi.mocked(userContext.env.QUEUE.send).mockClear();

    const comment = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "What a view",
      }),
    );

    const { DOMAIN } = serverEnv(userContext.env);
    const heading = `${Array.from(LONG_TEXT).slice(0, 40).join("")}…`;
    const webhook = queued().find((message) => message.type === "WEBHOOK");
    expect(webhook?.data.event).toEqual({
      type: "comment.admin_root_created",
      data: {
        target: "moment",
        postTitle: heading,
        commenterName: "Test User",
        commentPreview: "What a view",
        commentUrl: `https://${DOMAIN}/moments/${moment.id}?comment=${comment.id}`,
      },
    });

    const email = queued().find((message) => message.type === "EMAIL");
    expect(email?.data.to).toBe("admin@example.com");
    expect(email?.data.subject).toContain(heading);
    expect(email?.data.html).toContain(
      `/moments/${moment.id}?comment=${comment.id}`,
    );
  });

  it("name a Moment with no text by what it holds", async () => {
    await enableWebhook();
    const media = await MediaRepo.insertMedia(adminContext.db, {
      key: "moment-comment.png",
      url: "/images/moment-comment.png",
      fileName: "moment-comment.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    const moment = await postMoment({ images: [`/images/${media.key}`] });
    vi.mocked(userContext.env.QUEUE.send).mockClear();

    unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Lovely photo",
      }),
    );

    const { LOCALE } = serverEnv(userContext.env);
    const webhook = queued().find((message) => message.type === "WEBHOOK");
    expect(webhook?.data.event?.data).toMatchObject({
      target: "moment",
      postTitle: m.moments_image_only({}, { locale: LOCALE }),
    });
  });

  it("tell the author of the comment replied to, linking the reply on the Moment", async () => {
    const moment = await postMoment({ text: "reply here" });
    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Root",
      }),
    );
    vi.mocked(userContext.env.QUEUE.send).mockClear();

    const reply = unwrap(
      await CommentService.createComment(adminContext, {
        momentId: moment.id,
        content: "Thanks!",
        rootId: root.id,
      }),
    );

    const email = queued().find((message) => message.type === "EMAIL");
    expect(email?.data.to).toBe("user@example.com");
    expect(email?.data.subject).toContain("reply here");
    expect(email?.data.html).toContain(
      `/moments/${moment.id}?comment=${reply.id}`,
    );
  });

  it("keep a Post comment's payload, saying it is on a Post", async () => {
    await enableWebhook();
    const { id: postId } = await PostService.createEmptyPost(adminContext);
    const slug = `notified-${Date.now()}`;
    unwrap(
      await PostService.updatePost(adminContext, {
        id: postId,
        data: { title: "Notified Post", slug },
      }),
    );
    unwrap(await PostService.publishPost(adminContext, { id: postId }));
    vi.mocked(userContext.env.QUEUE.send).mockClear();

    const comment = unwrap(
      await CommentService.createComment(userContext, {
        postId,
        content: "On a Post",
      }),
    );

    const { DOMAIN } = serverEnv(userContext.env);
    const webhook = queued().find((message) => message.type === "WEBHOOK");
    expect(webhook?.data.event?.data).toEqual({
      target: "post",
      postTitle: "Notified Post",
      commenterName: "Test User",
      commentPreview: "On a Post",
      commentUrl: `https://${DOMAIN}/post/${slug}?comment=${comment.id}`,
    });
  });
});

describe("where a Moment's comments are listed", () => {
  it("the Admin's reply queue names the Moment and links the Comment, until an Admin replies", async () => {
    const moment = await postMoment({ text: LONG_TEXT });
    const comment = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Waiting",
      }),
    );

    const page = await DashboardService.listUnrepliedComments(adminContext, {
      limit: 20,
    });
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      id: comment.id,
      postId: null,
      postTitle: null,
      postSlug: null,
      momentId: moment.id,
      momentTitle: `${Array.from(LONG_TEXT).slice(0, 40).join("")}…`,
      commentPath: `/moments/${moment.id}?comment=${comment.id}`,
    });

    const overview = await DashboardService.getDashboardOverview(adminContext);
    expect(overview.stats.comments).toBe(1);

    // An Admin's reply on the Moment answers it, as on a Post.
    unwrap(
      await CommentService.createComment(adminContext, {
        momentId: moment.id,
        content: "Answered",
        rootId: comment.id,
      }),
    );
    expect(
      (
        await DashboardService.listUnrepliedComments(adminContext, {
          limit: 20,
        })
      ).total,
    ).toBe(0);
  });

  it("counts a root as answered by an Admin's reply in its thread on the same Moment only", async () => {
    const moment = await postMoment({ text: "queue" });
    const comment = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Waiting",
      }),
    );
    // A legacy-shaped Admin row in the thread without a reply target.
    await CommentRepo.insertComment(adminContext.db, {
      momentId: moment.id,
      content: "Old-style answer",
      rootId: comment.id,
      userId: adminContext.session.user.id,
      status: "published",
    });
    expect(
      (
        await DashboardService.listUnrepliedComments(adminContext, {
          limit: 20,
        })
      ).total,
    ).toBe(0);
  });

  it("a User's own comments say which Moment each is on", async () => {
    const moment = await postMoment({ text: "mine" });
    const comment = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "My comment",
      }),
    );

    const mine = await CommentService.getMyComments(userContext, {});
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({
      id: comment.id,
      postId: null,
      momentId: moment.id,
      momentTitle: "mine",
      commentPath: `/moments/${moment.id}?comment=${comment.id}`,
    });
    expect(mine[0]).not.toHaveProperty("handledAt");
  });
});

describe("a Moment's comments over the HTTP API", () => {
  async function call(path: string) {
    const request = new Request(`http://localhost:3000/api${path}`);
    const { response } = await openAPIHandler.handle(request, {
      prefix: "/api",
      context: createApiContext(request.headers, env, createMockExecutionCtx()),
    });
    if (!response) throw new Error(`No route matched GET ${path}`);
    return response;
  }

  it("lists, threads and counts them under the Moment's path", async () => {
    const moment = await postMoment({ text: "over http" });
    const root = unwrap(
      await CommentService.createComment(userContext, {
        momentId: moment.id,
        content: "Root",
      }),
    );
    const reply = unwrap(
      await CommentService.createComment(otherContext, {
        momentId: moment.id,
        content: "Reply",
        rootId: root.id,
      }),
    );

    const roots = await call(`/moments/${moment.id}/comments`);
    expect(roots.status).toBe(200);
    expect(await roots.json()).toMatchObject({
      total: 2,
      items: [{ id: root.id, momentId: moment.id, postId: null }],
    });

    const replies = await call(
      `/moments/${moment.id}/comments/${root.id}/replies`,
    );
    expect(await replies.json()).toMatchObject({
      total: 1,
      items: [{ id: reply.id }],
    });

    const thread = await call(
      `/moments/${moment.id}/comments/${reply.id}/thread`,
    );
    expect(await thread.json()).toMatchObject({ id: root.id, replyCount: 1 });

    const read = await call(`/moments/${moment.id}`);
    expect(await read.json()).toMatchObject({ commentCount: 2 });
  });

  it("names the Moment in the path alone", async () => {
    const moment = await postMoment({ text: "path" });
    expect((await call("/moments/1e0/comments")).status).toBe(400);
    expect((await call(`/moments/${moment.id}/comments?postId=1`)).status).toBe(
      400,
    );
    expect((await call(`/moments/${moment.id}/comments/1/thread`)).status).toBe(
      404,
    );
  });
});
