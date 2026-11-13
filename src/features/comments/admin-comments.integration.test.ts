import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createAuthTestContext,
  createMockExecutionCtx,
  createMockSession,
  seedUser,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import * as CommentService from "@/features/comments/comments.service";
import { DEFAULT_CONFIG } from "@/features/config/config.schema";
import * as ConfigRepo from "@/features/config/data/config.data";
import * as DashboardService from "@/features/dashboard/service/dashboard.service";
import * as MomentService from "@/features/moments/services/moments.service";
import * as MutedUserService from "@/features/muted-users/service/muted-users.service";
import * as PostService from "@/features/posts/services/posts.service";
import { CommentsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/** The Admin's Comments page: what awaits a reply, and every Comment. */

let adminContext: ReturnType<typeof createAdminTestContext>;
let aliceContext: ReturnType<typeof createAuthTestContext>;
let bobContext: ReturnType<typeof createAuthTestContext>;

function visitor(id: string, name: string) {
  return createAuthTestContext({
    session: createMockSession({
      user: { id, name, email: `${id}@example.com`, role: null },
    }),
    executionCtx: createMockExecutionCtx(),
  });
}

beforeEach(async () => {
  adminContext = createAdminTestContext({
    executionCtx: createMockExecutionCtx(),
  });
  await seedUser(adminContext.db, adminContext.session.user);
  aliceContext = visitor("alice", "Alice");
  bobContext = visitor("bob", "Bob Builder");
  await seedUser(aliceContext.db, aliceContext.session.user);
  await seedUser(bobContext.db, bobContext.session.user);
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

/** Comments written one minute apart, so their order is the writing order. */
let minute = 0;
async function comment(
  context: ReturnType<typeof createAuthTestContext>,
  input: Parameters<typeof CommentService.createComment>[1],
) {
  const created = unwrap(await CommentService.createComment(context, input));
  minute += 1;
  await adminContext.db
    .update(CommentsTable)
    .set({ createdAt: new Date(Date.UTC(2026, 0, 1, 0, minute)) })
    .where(eq(CommentsTable.id, created.id));
  return created;
}

async function list(
  input: Parameters<typeof CommentService.listAdminComments>[1],
) {
  return unwrap(await CommentService.listAdminComments(adminContext, input));
}

const ids = (page: { items: Array<{ id: number }> }) =>
  page.items.map((item) => item.id);

describe("every Comment", () => {
  it("lists published Comments newest first, a page at a time", async () => {
    const postId = await publishPost("first");
    const a = await comment(aliceContext, { postId, content: "one" });
    const b = await comment(bobContext, { postId, content: "two" });
    const reply = await comment(adminContext, {
      postId,
      content: "thanks",
      rootId: a.id,
      replyToCommentId: a.id,
    });
    const gone = await comment(aliceContext, { postId, content: "gone" });
    unwrap(await CommentService.deleteComment(aliceContext, { id: gone.id }));

    const all = await list({ view: "all" });
    expect(ids(all)).toEqual([reply.id, b.id, a.id]);
    expect(all.total).toBe(3);

    const second = await list({ view: "all", offset: 1, limit: 1 });
    expect(ids(second)).toEqual([b.id]);
    expect(second.total).toBe(3);
    expect((await list({ view: "all", offset: 3 })).items).toEqual([]);
  });

  it("says who wrote each, whom it answers, where it is and its state", async () => {
    const postId = await publishPost("where");
    const root = await comment(aliceContext, { postId, content: "root" });
    const reply = await comment(bobContext, {
      postId,
      content: "reply",
      rootId: root.id,
      replyToCommentId: root.id,
    });
    await comment(adminContext, {
      postId,
      content: "answer",
      rootId: root.id,
      replyToCommentId: root.id,
    });
    unwrap(await CommentService.markCommentHandled(adminContext, reply));
    unwrap(await MutedUserService.muteUser(adminContext, { userId: "bob" }));

    const { items } = await list({ view: "all" });
    const byId = new Map(items.map((item) => [item.id, item]));
    const post = await PostService.findPostById(adminContext, { id: postId });

    expect(byId.get(root.id)).toMatchObject({
      author: { id: "alice", name: "Alice", isAdmin: false, muted: false },
      replyToName: null,
      pageTitle: "where",
      commentPath: `/post/${post?.slug}?comment=${root.id}`,
      answered: true,
      handled: true,
      awaitingReply: false,
    });
    expect(byId.get(reply.id)).toMatchObject({
      author: { id: "bob", muted: true },
      replyToName: "Alice",
      answered: false,
      handled: true,
      awaitingReply: false,
    });
    expect(items.find((item) => item.author.isAdmin)).toMatchObject({
      replyToName: "Alice",
      awaitingReply: false,
    });
    for (const item of items) expect(item).not.toHaveProperty("handledAt");
  });

  it("names a Moment's Comment by the Moment and links its page", async () => {
    const moment = unwrap(
      await MomentService.createMoment(adminContext, { text: "by the sea" }),
    );
    const onMoment = await comment(aliceContext, {
      momentId: moment.id,
      content: "nice",
    });

    const [item] = (await list({ view: "all" })).items;
    expect(item).toMatchObject({
      id: onMoment.id,
      momentId: moment.id,
      pageTitle: "by the sea",
      commentPath: `/moments/${moment.id}?comment=${onMoment.id}`,
      awaitingReply: true,
    });
  });

  it("searches the author's name and the body, ignoring case", async () => {
    const postId = await publishPost("search");
    const a = await comment(aliceContext, { postId, content: "Lovely READ" });
    const b = await comment(bobContext, { postId, content: "hello" });

    expect(ids(await list({ view: "all", search: "bob" }))).toEqual([b.id]);
    expect(ids(await list({ view: "all", search: "read" }))).toEqual([a.id]);
    const none = await list({ view: "all", search: "nothing like it" });
    expect(none).toEqual({ items: [], total: 0 });
  });

  it("keeps one Post's Comments and refuses a Post that does not exist", async () => {
    const first = await publishPost("one-post");
    const second = await publishPost("other-post");
    const a = await comment(aliceContext, { postId: first, content: "a" });
    await comment(aliceContext, { postId: second, content: "b" });
    const c = await comment(bobContext, { postId: first, content: "c" });

    const filtered = await list({ view: "all", postId: first });
    expect(ids(filtered)).toEqual([c.id, a.id]);
    expect(filtered.total).toBe(2);

    const missing = await CommentService.listAdminComments(adminContext, {
      view: "all",
      postId: 999_999,
    });
    expect(missing.error).toEqual({ reason: "POST_NOT_FOUND" });

    expect(await CommentService.listCommentedPosts(adminContext)).toEqual([
      { id: first, title: "one-post", comments: 2 },
      { id: second, title: "other-post", comments: 1 },
    ]);
  });
});

describe("the Comments awaiting a reply", () => {
  it("are the dashboard's unreplied Comments, with its count", async () => {
    const postId = await publishPost("queue");
    const a = await comment(aliceContext, { postId, content: "a" });
    const b = await comment(bobContext, { postId, content: "b" });
    const c = await comment(aliceContext, { postId, content: "c" });
    await comment(adminContext, {
      postId,
      content: "answer",
      rootId: a.id,
      replyToCommentId: a.id,
    });
    unwrap(await CommentService.markCommentHandled(adminContext, b));

    const unreplied = await list({ view: "unreplied" });
    const dashboard = await DashboardService.listUnrepliedComments(
      adminContext,
      { limit: 50 },
    );
    expect(ids(unreplied)).toEqual([c.id]);
    expect(ids(unreplied)).toEqual(ids(dashboard));
    expect(unreplied.total).toBe(dashboard.total);

    unwrap(await CommentService.unmarkCommentHandled(adminContext, b));
    const again = await list({ view: "unreplied" });
    expect(ids(again)).toEqual([c.id, b.id]);
    expect(again.items.every((item) => item.awaitingReply)).toBe(true);
  });
});

describe("over the HTTP API", () => {
  async function get(path: string, session: unknown) {
    const request = new Request(`http://localhost:3000/api${path}`);
    const context = createApiContext(
      request.headers,
      env,
      createMockExecutionCtx(),
    );
    const auth = { api: { getSession: async () => session } } as never;
    const { response } = await openAPIHandler.handle(request, {
      prefix: "/api",
      context: { ...context, getAuth: async () => auth },
    });
    if (!response) throw new Error(`No route matched GET ${path}`);
    return response;
  }

  it("answers an Admin and refuses everyone else as other Admin calls do", async () => {
    const postId = await publishPost("http");
    await comment(aliceContext, { postId, content: "hi" });
    const path = `/admin/comments?view=all&search=hi&postId=${postId}&limit=5`;

    const admin = await get(path, adminContext.session);
    expect(admin.status).toBe(200);
    const body = (await admin.json()) as {
      items: Array<Record<string, unknown>>;
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.items[0]).not.toHaveProperty("handledAt");

    expect((await get(path, aliceContext.session)).status).toBe(403);
    expect((await get(path, null)).status).toBe(401);
    expect(
      (await get("/admin/comments/posts", aliceContext.session)).status,
    ).toBe(403);
    expect((await get("/admin/comments/posts", null)).status).toBe(401);
    expect(
      (
        await get(
          "/admin/comments?view=all&postId=999999",
          adminContext.session,
        )
      ).status,
    ).toBe(404);
  });
});
