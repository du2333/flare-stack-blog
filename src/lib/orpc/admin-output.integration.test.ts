import { env } from "cloudflare:workers";
import { createMockExecutionCtx, seedAdminApiKey } from "tests/test-utils";
import { describe, expect, it } from "vitest";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * The Post, Tag, Category and Media operations declare the response they
 * answer, and oRPC validates every response against it. Each operation is
 * called through the HTTP route here, so a schema that does not describe what
 * the handler returns fails as a 500 instead of reaching a client.
 */

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

// A 23 x 17 PNG, real encoder output.
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAABcAAAARCAIAAAC5EaDqAAAAHUlEQVR4nGOsCDjBQDFgotyIUVNGTRk1ZdQUrAAAlAUBsqIel+IAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

async function call<T = unknown>(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }
  const request = new Request(`http://localhost:3000/api${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context: createApiContext(request.headers, env, createMockExecutionCtx()),
  });
  if (!response) throw new Error(`No route matched ${request.method} ${path}`);
  const text = await response.text();
  return {
    status: response.status,
    text,
    json: (text ? JSON.parse(text) : null) as T,
  };
}

function imageForm(name: string) {
  const form = new FormData();
  form.set("image", new File([PNG], name, { type: "image/png" }));
  return form;
}

describe("Post operations", () => {
  it("answer create, update, slug, delete and the revision writes", async () => {
    const apiKey = await seedAdminApiKey();

    const created = await call<{ id: number; saveToken: string }>(
      apiKey,
      "/admin/posts",
      {
        method: "POST",
        body: { data: { title: "Typed", contentJson: paragraph("one") } },
      },
    );
    expect(created.status).toBe(200);
    expect(created.json.saveToken).toEqual(expect.any(String));
    const id = created.json.id;

    const empty = await call<{ id: number; saveToken: string }>(
      apiKey,
      "/admin/posts",
      { method: "POST" },
    );
    expect(empty.status).toBe(200);
    expect(empty.json.id).not.toBe(id);

    const slug = await call(apiKey, "/admin/posts/slug?title=Typed");
    expect(slug.status).toBe(200);
    expect(slug.json).toEqual({ slug: "typed-1" });

    const category = await call<{ id: number }>(apiKey, "/admin/categories", {
      method: "POST",
      body: { name: "Notes" },
    });
    const tag = await call<{ id: number }>(apiKey, "/admin/tags", {
      method: "POST",
      body: { name: "bun" },
    });
    expect(
      (
        await call(apiKey, `/admin/posts/${id}/tags`, {
          method: "PUT",
          body: { tagIds: [tag.json.id] },
        })
      ).status,
    ).toBe(200);

    const updated = await call<Record<string, unknown>>(
      apiKey,
      `/admin/posts/${id}`,
      {
        method: "PATCH",
        body: {
          data: { title: "Typed again", categoryId: category.json.id },
        },
      },
    );
    expect(updated.status).toBe(200);
    expect(updated.json).toMatchObject({
      id,
      title: "Typed again",
      status: "draft",
      categoryId: category.json.id,
      category: { id: category.json.id, name: "Notes" },
      tags: [{ id: tag.json.id, name: "bun" }],
      hasUnpublishedChanges: false,
      contentJson: paragraph("one"),
    });
    expect(updated.json.saveToken).toEqual(expect.any(String));
    expect(updated.json.saveToken).not.toBe(created.json.saveToken);
    // Not part of the answer: the public snapshot and the change tracking.
    expect(updated.json).not.toHaveProperty("publicSnapshotJson");
    expect(updated.json).not.toHaveProperty("draftFingerprint");
    expect(updated.json).not.toHaveProperty("publicSlug");

    const publishedPublish = await call(apiKey, `/admin/posts/${id}/publish`, {
      method: "POST",
      body: {},
    });
    expect(publishedPublish.status).toBe(200);
    const edited = await call<{ hasUnpublishedChanges: boolean }>(
      apiKey,
      `/admin/posts/${id}`,
      { method: "PATCH", body: { data: { title: "Edited after publish" } } },
    );
    expect(edited.status).toBe(200);
    expect(edited.json.hasUnpublishedChanges).toBe(true);

    const revisions = await call<Array<{ id: number }>>(
      apiKey,
      `/admin/posts/${id}/revisions`,
    );
    expect(revisions.json.length).toBeGreaterThan(0);
    const revisionId = revisions.json[0].id;

    const restored = await call<{
      post: Record<string, unknown>;
      restored: boolean;
      revisionId: number;
    }>(apiKey, `/admin/posts/${id}/revisions/${revisionId}/restore`, {
      method: "POST",
    });
    expect(restored.status).toBe(200);
    expect(restored.json).toMatchObject({
      restored: true,
      revisionId,
      post: {
        id,
        status: "published",
        publicSlug: "typed",
        category: { name: "Notes" },
        tags: [{ name: "bun" }],
      },
    });
    expect(restored.json.post.saveToken).toEqual(expect.any(String));
    expect(restored.json.post).not.toHaveProperty("publicSnapshotJson");

    const removedRevisions = await call(
      apiKey,
      `/admin/posts/${id}/revisions`,
      { method: "DELETE", body: { revisionIds: [revisionId] } },
    );
    expect(removedRevisions.status).toBe(200);
    expect(removedRevisions.json).toEqual({
      deletedIds: [revisionId],
      deletedCount: 1,
    });

    const removed = await call(apiKey, `/admin/posts/${id}`, {
      method: "DELETE",
    });
    expect(removed.status).toBe(200);
    expect(removed.json).toEqual({ success: true });
  });
});

describe("Tag operations", () => {
  it("answer every tag operation", async () => {
    const apiKey = await seedAdminApiKey();
    const post = await call<{ id: number }>(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "Tagged" } },
    });

    const created = await call<{ id: number; name: string; createdAt: string }>(
      apiKey,
      "/admin/tags",
      { method: "POST", body: { name: "alpha" } },
    );
    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({ name: "alpha" });
    const tagId = created.json.id;

    const plain = await call(apiKey, "/admin/tags");
    expect(plain.status).toBe(200);
    expect(plain.json).toEqual([
      { id: tagId, name: "alpha", createdAt: expect.any(String) },
    ]);

    const counted = await call(apiKey, "/admin/tags?withCount=true");
    expect(counted.status).toBe(200);
    expect(counted.json).toEqual([
      { id: tagId, name: "alpha", createdAt: expect.any(String), postCount: 0 },
    ]);

    const renamed = await call(apiKey, `/admin/tags/${tagId}`, {
      method: "PATCH",
      body: { data: { name: "beta" } },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.json).toMatchObject({ id: tagId, name: "beta" });

    const set = await call<{ saveToken: string }>(
      apiKey,
      `/admin/posts/${post.json.id}/tags`,
      { method: "PUT", body: { tagIds: [tagId] } },
    );
    expect(set.status).toBe(200);
    expect(set.json.saveToken).toEqual(expect.any(String));

    const missing = await call(apiKey, "/admin/posts/999999/tags", {
      method: "PUT",
      body: { tagIds: [] },
    });
    expect(missing.status).toBe(404);
    expect(missing.json).toMatchObject({ code: "POST_NOT_FOUND" });

    const ofPost = await call(apiKey, `/admin/posts/${post.json.id}/tags`);
    expect(ofPost.status).toBe(200);
    expect(ofPost.json).toEqual([
      { id: tagId, name: "beta", createdAt: expect.any(String) },
    ]);

    const withCount = await call(apiKey, "/admin/tags/with-count");
    expect(withCount.status).toBe(200);
    expect(withCount.json).toEqual([
      {
        id: tagId,
        name: "beta",
        createdAt: expect.any(String),
        postCount: 1,
        publicPostCount: 0,
      },
    ]);

    const removed = await call(apiKey, `/admin/tags/${tagId}`, {
      method: "DELETE",
    });
    expect(removed.status).toBe(200);
    expect(removed.json).toEqual({ success: true });
  });
});

describe("Category operations", () => {
  it("answer every category operation", async () => {
    const apiKey = await seedAdminApiKey();

    const created = await call<{ id: number }>(apiKey, "/admin/categories", {
      method: "POST",
      body: { name: "Essays" },
    });
    expect(created.status).toBe(200);
    expect(created.json).toMatchObject({ name: "Essays" });
    const categoryId = created.json.id;

    const renamed = await call(apiKey, `/admin/categories/${categoryId}`, {
      method: "PATCH",
      body: { data: { name: "Long essays" } },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.json).toMatchObject({ id: categoryId, name: "Long essays" });

    const list = await call(apiKey, "/admin/categories");
    expect(list.status).toBe(200);
    expect(list.json).toEqual({
      items: [
        {
          id: categoryId,
          name: "Long essays",
          createdAt: expect.any(String),
          postCount: 0,
          publicPostCount: 0,
        },
      ],
      uncategorizedPostCount: 0,
      uncategorizedPublicPostCount: 0,
    });

    const options = await call(apiKey, "/admin/categories/options");
    expect(options.status).toBe(200);
    expect(options.json).toEqual([{ id: categoryId, name: "Long essays" }]);

    const removed = await call(apiKey, `/admin/categories/${categoryId}`, {
      method: "DELETE",
    });
    expect(removed.status).toBe(200);
    expect(removed.json).toEqual({ success: true });
  });
});

describe("Media operations", () => {
  it("answer every media operation", async () => {
    const apiKey = await seedAdminApiKey();

    const uploaded = await call<{ key: string; url: string }>(
      apiKey,
      "/admin/media",
      { method: "POST", form: imageForm("first.png") },
    );
    expect(uploaded.status).toBe(200);
    expect(uploaded.json).toMatchObject({
      fileName: "first.png",
      mimeType: "image/png",
      width: 23,
      height: 17,
    });
    const { key } = uploaded.json;

    const list = await call(apiKey, "/admin/media");
    expect(list.status).toBe(200);
    expect(list.json).toMatchObject({
      items: [
        {
          key,
          postCount: 0,
          revisionOnlyPostCount: 0,
          momentCount: 0,
          isCover: false,
        },
      ],
      nextCursor: null,
    });

    const stats = await call(apiKey, "/admin/media/stats");
    expect(stats.status).toBe(200);
    expect(stats.json).toEqual({
      totalCount: 1,
      unusedCount: 1,
      totalBytes: PNG.byteLength,
    });

    const size = await call(apiKey, "/admin/media/size");
    expect(size.status).toBe(200);
    expect(size.json).toBe(PNG.byteLength);

    const linkedKeys = await call(apiKey, "/admin/media/linked-keys", {
      method: "POST",
      body: { keys: [key] },
    });
    expect(linkedKeys.status).toBe(200);
    expect(linkedKeys.json).toEqual([]);

    const linkedPosts = await call(apiKey, `/admin/media/${key}/posts`);
    expect(linkedPosts.status).toBe(200);
    expect(linkedPosts.json).toEqual([]);

    const renamed = await call(apiKey, `/admin/media/${key}`, {
      method: "PATCH",
      body: { name: "renamed.png" },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.text).toBe("");

    const replaced = await call(apiKey, `/admin/media/${key}/replace`, {
      method: "POST",
      form: imageForm("second.png"),
    });
    expect(replaced.status).toBe(200);
    expect(replaced.json).toMatchObject({ key, fileName: "second.png" });

    const second = await call<{ key: string }>(apiKey, "/admin/media", {
      method: "POST",
      form: imageForm("third.png"),
    });
    const removed = await call(apiKey, `/admin/media/${second.json.key}`, {
      method: "DELETE",
    });
    expect(removed.status).toBe(200);
    expect(removed.json).toEqual({ success: true });

    const unused = await call(apiKey, "/admin/media/unused", {
      method: "DELETE",
    });
    expect(unused.status).toBe(200);
    expect(unused.json).toEqual({ data: { count: 1 }, error: null });
  });

  it("answer 404 MEDIA_NOT_FOUND for a key no Media has", async () => {
    const apiKey = await seedAdminApiKey();

    const removed = await call(apiKey, "/admin/media/missing.png", {
      method: "DELETE",
    });
    expect(removed.status).toBe(404);
    expect(removed.json).toMatchObject({ code: "MEDIA_NOT_FOUND" });

    const renamed = await call(apiKey, "/admin/media/missing.png", {
      method: "PATCH",
      body: { name: "renamed.png" },
    });
    expect(renamed.status).toBe(404);
    expect(renamed.json).toMatchObject({ code: "MEDIA_NOT_FOUND" });
  });

  it("lists the posts that use an image as their cover", async () => {
    const apiKey = await seedAdminApiKey();
    const uploaded = await call<{ id: number; key: string }>(
      apiKey,
      "/admin/media",
      { method: "POST", form: imageForm("used.png") },
    );
    const { id: mediaId, key } = uploaded.json;
    const post = await call<{ id: number }>(apiKey, "/admin/posts", {
      method: "POST",
      body: { data: { title: "With cover" } },
    });
    const covered = await call(apiKey, `/admin/posts/${post.json.id}`, {
      method: "PATCH",
      body: { data: { coverMediaId: mediaId } },
    });
    expect(covered.status).toBe(200);
    expect(covered.json).toMatchObject({ coverMediaId: mediaId });

    const linkedKeys = await call(apiKey, "/admin/media/linked-keys", {
      method: "POST",
      body: { keys: [key] },
    });
    expect(linkedKeys.json).toEqual([key]);

    const linkedPosts = await call(apiKey, `/admin/media/${key}/posts`);
    expect(linkedPosts.status).toBe(200);
    expect(linkedPosts.json).toEqual([
      {
        id: post.json.id,
        title: "With cover",
        slug: "with-cover",
        status: "draft",
        isCover: true,
        revisionsOnly: false,
      },
    ]);

    const list = await call(apiKey, "/admin/media");
    expect(list.json).toMatchObject({
      items: [{ key, postCount: 1, revisionOnlyPostCount: 0, isCover: true }],
    });
  });
});
