import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import {
  createAdminTestContext,
  createMockExecutionCtx,
  seedAdminApiKey,
} from "tests/test-utils";
import { describe, expect, it } from "vitest";
import * as CategoryService from "@/features/categories/categories.service";
import * as MediaRepo from "@/features/media/data/media.data";
import * as TagService from "@/features/tags/tags.service";
import {
  CategoriesTable,
  MediaTable,
  PostPublicTagsTable,
  PostRevisionsTable,
  PostsTable,
  TagsTable,
} from "@/lib/db/schema";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

/**
 * Unpublished Changes the way the admin editor and API clients meet them:
 * over the Admin HTTP API, which carries `hasUnpublishedChanges`, the list
 * filter and the discard endpoint.
 */

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

type AdminPost = {
  id: number;
  title: string;
  summary: string | null;
  slug: string;
  status: string;
  saveToken: string;
  contentJson: unknown;
  categoryId: number | null;
  tags: Array<{ id: number }>;
  cover: { id: number } | null;
  published: PublishedVersion | null;
  hasUnpublishedChanges: boolean;
};

type PublishedVersion = {
  title: string;
  summary: string | null;
  slug: string;
  publishedAt: string;
  cover: { id: number; url: string; fileName: string } | null;
  categoryId: number | null;
  tagIds: Array<number>;
};

type ListPage = {
  items: Array<{ id: number; hasUnpublishedChanges: boolean }>;
  total: number;
  statusCounts: {
    draft: number;
    published: number;
    unpublishedChanges: number;
  };
};

async function callAdminApi(
  apiKey: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
) {
  const headers = new Headers({ "x-api-key": apiKey });
  let body: string | undefined;
  if (init.body !== undefined) {
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
  return response;
}

async function createPost(apiKey: string, title: string) {
  const response = await callAdminApi(apiKey, "/admin/posts", {
    method: "POST",
    body: { data: { title, contentJson: paragraph(`${title} body`) } },
  });
  expect(response.status).toBe(200);
  return ((await response.json()) as { id: number }).id;
}

async function readPost(apiKey: string, id: number) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}`);
  expect(response.status).toBe(200);
  return (await response.json()) as AdminPost;
}

async function patchPost(
  apiKey: string,
  id: number,
  data: Record<string, unknown>,
) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
    method: "PATCH",
    body: { data },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as AdminPost;
}

async function publish(apiKey: string, id: number) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}/publish`, {
    method: "POST",
    body: {},
  });
  expect(response.status).toBe(200);
}

async function setTags(apiKey: string, id: number, tagIds: Array<number>) {
  const response = await callAdminApi(apiKey, `/admin/posts/${id}/tags`, {
    method: "PUT",
    body: { tagIds },
  });
  expect(response.status).toBe(200);
}

function discard(apiKey: string, id: number, saveToken?: string) {
  return callAdminApi(apiKey, `/admin/posts/${id}/discard-changes`, {
    method: "POST",
    body: saveToken === undefined ? {} : { saveToken },
  });
}

async function listPosts(apiKey: string, query: string) {
  const response = await callAdminApi(apiKey, `/admin/posts?${query}`);
  expect(response.status).toBe(200);
  return (await response.json()) as ListPage;
}

async function revisionReasons(apiKey: string, id: number) {
  const revisions = (await (
    await callAdminApi(apiKey, `/admin/posts/${id}/revisions`)
  ).json()) as Array<{ reason: string }>;
  return revisions.map((revision) => revision.reason);
}

async function seedTaxonomy(name: string) {
  const { db } = createAdminTestContext();
  const [category, otherCategory] = await db
    .insert(CategoriesTable)
    .values([{ name: `${name}-category` }, { name: `${name}-other-category` }])
    .returning();
  const [tag, otherTag] = await db
    .insert(TagsTable)
    .values([{ name: `${name}-tag` }, { name: `${name}-other-tag` }])
    .returning();
  return { db, category, otherCategory, tag, otherTag };
}

describe("hasUnpublishedChanges", () => {
  it("is false for a draft, whatever is edited", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-draft");
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
    const saved = await patchPost(apiKey, id, { title: "uc-draft edited" });
    expect(saved.hasUnpublishedChanges).toBe(false);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
  });

  it("follows the draft against the published version, field by field", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-fields");
    await publish(apiKey, id);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);

    const original = await readPost(apiKey, id);
    const edits: Array<[Record<string, unknown>, Record<string, unknown>]> = [
      [{ title: "uc-fields changed" }, { title: original.title }],
      [{ summary: "a summary" }, { summary: original.summary }],
      [{ slug: "uc-fields-slug" }, { slug: original.slug }],
      [
        { contentJson: paragraph("changed body") },
        { contentJson: original.contentJson },
      ],
    ];
    for (const [edit, undo] of edits) {
      const edited = await patchPost(apiKey, id, edit);
      expect(edited.hasUnpublishedChanges).toBe(true);
      expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);

      const undone = await patchPost(apiKey, id, undo);
      expect(undone.hasUnpublishedChanges).toBe(false);
      expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
    }
  });

  it("clears when the changes are published", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-publish");
    await publish(apiKey, id);
    await patchPost(apiKey, id, { title: "uc-publish edited" });
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);

    await publish(apiKey, id);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
  });

  it("starts again after unpublishing and publishing", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-unpublish");
    await publish(apiKey, id);
    await patchPost(apiKey, id, { title: "uc-unpublish edited" });
    await callAdminApi(apiKey, `/admin/posts/${id}/unpublish`, {
      method: "POST",
      body: {},
    });
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);

    await publish(apiKey, id);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
  });

  it("ignores pinning", async () => {
    const apiKey = await seedAdminApiKey();
    const { db } = createAdminTestContext();
    const id = await createPost(apiKey, "uc-pin");
    await publish(apiKey, id);

    await db
      .update(PostsTable)
      .set({ pinnedAt: new Date() })
      .where(eq(PostsTable.id, id));

    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
    const page = await listPosts(apiKey, "search=uc-pin");
    expect(page.items.map((item) => item.hasUnpublishedChanges)).toEqual([
      false,
    ]);
  });

  it("follows Category and Tag assignments", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, tag, otherTag } = await seedTaxonomy("uc-assign");
    const id = await createPost(apiKey, "uc-assign");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);

    await setTags(apiKey, id, [tag.id, otherTag.id]);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);
    await setTags(apiKey, id, [tag.id]);
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);

    const uncategorized = await patchPost(apiKey, id, { categoryId: null });
    expect(uncategorized.hasUnpublishedChanges).toBe(true);
    const categorized = await patchPost(apiKey, id, {
      categoryId: category.id,
    });
    expect(categorized.hasUnpublishedChanges).toBe(false);
  });

  it("follows a revision restore", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-restore");
    await publish(apiKey, id);
    await patchPost(apiKey, id, { title: "uc-restore edited" });
    await publish(apiKey, id);
    const revisions = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}/revisions`)
    ).json()) as Array<{ id: number; reason: string; title: string }>;
    const first = revisions.find((revision) => revision.title === "uc-restore");

    await callAdminApi(
      apiKey,
      `/admin/posts/${id}/revisions/${first!.id}/restore`,
      { method: "POST", body: {} },
    );

    const restored = await readPost(apiKey, id);
    expect(restored.title).toBe("uc-restore");
    expect(restored.hasUnpublishedChanges).toBe(true);
  });

  it("is unchanged by a Category or Tag that is deleted after publishing", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const { category, tag, otherTag } = await seedTaxonomy("uc-delete");
    const id = await createPost(apiKey, "uc-delete");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id, otherTag.id]);
    await publish(apiKey, id);

    await CategoryService.deleteCategory(context, { id: category.id });
    await TagService.deleteTag(context, { id: tag.id });

    const after = await readPost(apiKey, id);
    expect(after.categoryId).toBeNull();
    expect(after.tags.map((t) => t.id)).toEqual([otherTag.id]);
    expect(after.hasUnpublishedChanges).toBe(false);

    await patchPost(apiKey, id, { title: "uc-delete edited" });
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);
  });
});

async function readPublished(apiKey: string, id: number) {
  return (await readPost(apiKey, id)).published;
}

describe("the published version a post read carries", () => {
  it("is null until the post is published and again after it is unpublished", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-pv-draft");
    expect(await readPublished(apiKey, id)).toBeNull();

    await publish(apiKey, id);
    expect(await readPublished(apiKey, id)).not.toBeNull();

    const response = await callAdminApi(
      apiKey,
      `/admin/posts/${id}/unpublish`,
      {
        method: "POST",
        body: {},
      },
    );
    expect(response.status).toBe(200);
    expect(await readPublished(apiKey, id)).toBeNull();
  });

  it("holds the draft's fields when nothing changed since publishing", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, tag } = await seedTaxonomy("uc-pv-clean");
    const id = await createPost(apiKey, "uc-pv-clean");
    await patchPost(apiKey, id, { categoryId: category.id, summary: "sum" });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);

    const read = await readPost(apiKey, id);
    expect(read.hasUnpublishedChanges).toBe(false);
    expect(read.published).toEqual({
      title: "uc-pv-clean",
      summary: "sum",
      slug: read.slug,
      publishedAt: expect.any(String),
      cover: null,
      categoryId: category.id,
      tagIds: [tag.id],
    });
  });

  it("stays the published fields, with the public Category and Tags, while the draft changes", async () => {
    const apiKey = await seedAdminApiKey();
    const { db, category, otherCategory, tag, otherTag } =
      await seedTaxonomy("uc-pv-edit");
    const media = await MediaRepo.insertMedia(db, {
      key: "uc-pv-cover.png",
      url: "/images/uc-pv-cover.png",
      fileName: "uc-pv-cover.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    const otherMedia = await MediaRepo.insertMedia(db, {
      key: "uc-pv-other.png",
      url: "/images/uc-pv-other.png",
      fileName: "uc-pv-other.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    const id = await createPost(apiKey, "uc-pv-edit");
    await patchPost(apiKey, id, {
      categoryId: category.id,
      summary: "first",
      coverMediaId: media.id,
    });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    const published = await readPublished(apiKey, id);
    expect(published).toMatchObject({
      cover: { id: media.id, url: "/images/uc-pv-cover.png" },
    });

    await patchPost(apiKey, id, {
      title: "uc-pv-edit edited",
      summary: "second",
      categoryId: otherCategory.id,
      coverMediaId: otherMedia.id,
      contentJson: paragraph("edited body"),
    });
    await setTags(apiKey, id, [otherTag.id]);

    const read = await readPost(apiKey, id);
    expect(read.hasUnpublishedChanges).toBe(true);
    expect(read.title).toBe("uc-pv-edit edited");
    expect(read.categoryId).toBe(otherCategory.id);
    expect(read.published).toEqual(published);

    // It is what discarding would write into the draft.
    await discard(apiKey, id);
    const discarded = await readPost(apiKey, id);
    expect(discarded.title).toBe(published!.title);
    expect(discarded.summary).toBe(published!.summary);
    expect(discarded.slug).toBe(published!.slug);
    expect(discarded.categoryId).toBe(published!.categoryId);
    expect(discarded.tags.map((t) => t.id)).toEqual(published!.tagIds);
    expect(discarded.cover?.id).toBe(published!.cover?.id);
  });

  it("drops a public Category and Tag that were deleted, as discarding would", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const { category, tag, otherTag } = await seedTaxonomy("uc-pv-deleted");
    const id = await createPost(apiKey, "uc-pv-deleted");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id, otherTag.id]);
    await publish(apiKey, id);
    expect(await readPublished(apiKey, id)).toMatchObject({
      categoryId: category.id,
      tagIds: [tag.id, otherTag.id].sort((a, b) => a - b),
    });

    await CategoryService.deleteCategory(context, { id: category.id });
    await TagService.deleteTag(context, { id: tag.id });
    await patchPost(apiKey, id, { title: "uc-pv-deleted edited" });

    const published = await readPublished(apiKey, id);
    expect(published?.categoryId).toBeNull();
    expect(published?.tagIds).toEqual([otherTag.id]);

    await discard(apiKey, id);
    const discarded = await readPost(apiKey, id);
    expect(discarded.categoryId).toBe(published?.categoryId);
    expect(discarded.tags.map((t) => t.id)).toEqual(published?.tagIds);
  });

  it("follows a publish, and has no cover once its Media is gone", async () => {
    const apiKey = await seedAdminApiKey();
    const { db, tag } = await seedTaxonomy("uc-pv-live");
    const media = await MediaRepo.insertMedia(db, {
      key: "uc-pv-gone.png",
      url: "/images/uc-pv-gone.png",
      fileName: "uc-pv-gone.png",
      mimeType: "image/png",
      sizeInBytes: 10,
    });
    const id = await createPost(apiKey, "uc-pv-live");
    await patchPost(apiKey, id, { coverMediaId: media.id });
    await publish(apiKey, id);
    await patchPost(apiKey, id, { title: "uc-pv-live edited" });
    await setTags(apiKey, id, [tag.id]);
    expect((await readPublished(apiKey, id))?.title).toBe("uc-pv-live");
    expect((await readPublished(apiKey, id))?.tagIds).toEqual([]);

    await publish(apiKey, id);
    const republished = await readPublished(apiKey, id);
    expect(republished?.title).toBe("uc-pv-live edited");
    expect(republished?.tagIds).toEqual([tag.id]);
    expect(republished?.cover?.id).toBe(media.id);

    await db.delete(MediaTable).where(eq(MediaTable.id, media.id));
    expect((await readPublished(apiKey, id))?.cover).toBeNull();
  });
});

describe("fingerprints", () => {
  it("cannot be written through the API and are not returned", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-readonly");
    const response = await callAdminApi(apiKey, `/admin/posts/${id}`, {
      method: "PATCH",
      body: { data: { draftFingerprint: "x", publishedFingerprint: "x" } },
    });
    expect(response.status).toBe(400);

    const read = (await readPost(apiKey, id)) as Record<string, unknown>;
    expect(read).not.toHaveProperty("draftFingerprint");
    expect(read).not.toHaveProperty("publishedFingerprint");
  });
});

describe("filtering the Admin list by Unpublished Changes", () => {
  it("returns exactly the published posts with changes, paged and counted", async () => {
    const apiKey = await seedAdminApiKey();
    const draft = await createPost(apiKey, "uc-list draft");
    const clean = await createPost(apiKey, "uc-list clean");
    const changedIds = [
      await createPost(apiKey, "uc-list changed one"),
      await createPost(apiKey, "uc-list changed two"),
      await createPost(apiKey, "uc-list changed three"),
    ];
    const reverted = await createPost(apiKey, "uc-list reverted");
    for (const id of [clean, reverted, ...changedIds]) {
      await publish(apiKey, id);
    }
    for (const id of changedIds) {
      await patchPost(apiKey, id, { summary: "edited after publishing" });
    }
    await patchPost(apiKey, reverted, { summary: "edited" });
    await patchPost(apiKey, reverted, { summary: null });
    await patchPost(apiKey, draft, { summary: "a draft summary" });

    const filtered = await listPosts(
      apiKey,
      "search=uc-list&hasUnpublishedChanges=true&sortBy=id&sortDir=ASC",
    );
    expect(filtered.items.map((item) => item.id)).toEqual(changedIds);
    expect(filtered.items.every((item) => item.hasUnpublishedChanges)).toBe(
      true,
    );
    expect(filtered.total).toBe(3);
    expect(filtered.statusCounts).toEqual({
      draft: 1,
      published: 5,
      unpublishedChanges: 3,
    });

    const pageTwo = await listPosts(
      apiKey,
      "search=uc-list&hasUnpublishedChanges=true&sortBy=id&sortDir=ASC&limit=2&offset=2",
    );
    expect(pageTwo.items.map((item) => item.id)).toEqual([changedIds[2]]);
    expect(pageTwo.total).toBe(3);

    const unfiltered = await listPosts(
      apiKey,
      "search=uc-list&sortBy=id&sortDir=ASC",
    );
    expect(unfiltered.total).toBe(6);
    expect(
      unfiltered.items
        .filter((item) => item.hasUnpublishedChanges)
        .map((item) => item.id),
    ).toEqual(changedIds);

    const asDraft = await listPosts(
      apiKey,
      "search=uc-list&hasUnpublishedChanges=true&status=draft",
    );
    expect(asDraft.items).toEqual([]);
    expect(asDraft.total).toBe(0);

    const narrowed = await listPosts(
      apiKey,
      "search=uc-list changed two&hasUnpublishedChanges=true",
    );
    expect(narrowed.items.map((item) => item.id)).toEqual([changedIds[1]]);
    expect(narrowed.statusCounts.unpublishedChanges).toBe(1);
  });
});

describe("posts published before fingerprints existed", () => {
  // The migration leaves both fingerprints null; the first Admin read
  // computes them from the draft and from the latest publish revision.
  async function forgetFingerprints(id: number) {
    const { db } = createAdminTestContext();
    await db
      .update(PostsTable)
      .set({ draftFingerprint: null, publishedFingerprint: null })
      .where(eq(PostsTable.id, id));
  }

  it("are settled on read: unchanged ones clean, edited ones with changes", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, tag } = await seedTaxonomy("uc-legacy");
    const clean = await createPost(apiKey, "uc-legacy clean");
    await patchPost(apiKey, clean, { categoryId: category.id });
    await setTags(apiKey, clean, [tag.id]);
    const edited = await createPost(apiKey, "uc-legacy edited");
    await publish(apiKey, clean);
    await publish(apiKey, edited);
    await patchPost(apiKey, edited, { title: "uc-legacy edited later" });
    await forgetFingerprints(clean);
    await forgetFingerprints(edited);

    expect((await readPost(apiKey, clean)).hasUnpublishedChanges).toBe(false);
    expect((await readPost(apiKey, edited)).hasUnpublishedChanges).toBe(true);

    // Undoing the edit clears it, as for any other post.
    await patchPost(apiKey, edited, { title: "uc-legacy edited" });
    expect((await readPost(apiKey, edited)).hasUnpublishedChanges).toBe(false);
  });

  it("are settled for the list and its filter before it answers", async () => {
    const apiKey = await seedAdminApiKey();
    const clean = await createPost(apiKey, "uc-legacy-list clean");
    const edited = await createPost(apiKey, "uc-legacy-list edited");
    await publish(apiKey, clean);
    await publish(apiKey, edited);
    await patchPost(apiKey, edited, { summary: "edited later" });
    await forgetFingerprints(clean);
    await forgetFingerprints(edited);

    const page = await listPosts(
      apiKey,
      "search=uc-legacy-list&hasUnpublishedChanges=true",
    );
    expect(page.items.map((item) => item.id)).toEqual([edited]);
    expect(page.total).toBe(1);
    expect(page.statusCounts).toEqual({
      draft: 0,
      published: 2,
      unpublishedChanges: 1,
    });
  });

  // What migration 0025 did for a post published under the old model, where
  // Category and Tags were live: the public assignments are the live ones.
  async function backfillPublicAssignments(
    id: number,
    categoryId: number | null,
    tagIds: Array<number>,
  ) {
    const { db } = createAdminTestContext();
    await db
      .update(PostsTable)
      .set({ publicCategoryId: categoryId })
      .where(eq(PostsTable.id, id));
    await db
      .delete(PostPublicTagsTable)
      .where(eq(PostPublicTagsTable.postId, id));
    if (tagIds.length > 0) {
      await db
        .insert(PostPublicTagsTable)
        .values(tagIds.map((tagId) => ({ postId: id, tagId })));
    }
  }

  it("with only Category and Tag edits since publishing have no changes", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, otherCategory, tag, otherTag } =
      await seedTaxonomy("uc-live");
    const id = await createPost(apiKey, "uc-live");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    await patchPost(apiKey, id, { categoryId: otherCategory.id });
    await setTags(apiKey, id, [tag.id, otherTag.id]);
    await backfillPublicAssignments(id, otherCategory.id, [
      tag.id,
      otherTag.id,
    ]);
    await forgetFingerprints(id);

    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(false);
    const page = await listPosts(
      apiKey,
      "search=uc-live&hasUnpublishedChanges=true",
    );
    expect(page.items).toEqual([]);

    // The next edit is a change as usual.
    await patchPost(apiKey, id, { title: "uc-live edited" });
    expect((await readPost(apiKey, id)).hasUnpublishedChanges).toBe(true);
  });

  it("discard restores the public Category and Tags, not the revision's", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, otherCategory, tag, otherTag } =
      await seedTaxonomy("uc-public");
    const id = await createPost(apiKey, "uc-public");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    await patchPost(apiKey, id, { categoryId: otherCategory.id });
    await setTags(apiKey, id, [tag.id, otherTag.id]);
    await backfillPublicAssignments(id, otherCategory.id, [
      tag.id,
      otherTag.id,
    ]);
    await patchPost(apiKey, id, {
      title: "uc-public edited",
      categoryId: null,
    });
    await setTags(apiKey, id, [otherTag.id]);
    await forgetFingerprints(id);

    const response = await discard(apiKey, id);

    expect(response.status).toBe(200);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("uc-public");
    expect(after.categoryId).toBe(otherCategory.id);
    expect(after.tags.map((t) => t.id).sort((a, b) => a - b)).toEqual(
      [tag.id, otherTag.id].sort((a, b) => a - b),
    );
    expect(after.hasUnpublishedChanges).toBe(false);
  });

  it("without a publish revision are compared by the snapshot's fields", async () => {
    const apiKey = await seedAdminApiKey();
    const { db } = createAdminTestContext();
    const clean = await createPost(apiKey, "uc-norev clean");
    const edited = await createPost(apiKey, "uc-norev edited");
    await publish(apiKey, clean);
    await publish(apiKey, edited);
    await patchPost(apiKey, edited, { title: "uc-norev edited later" });
    for (const id of [clean, edited]) {
      await db
        .delete(PostRevisionsTable)
        .where(eq(PostRevisionsTable.postId, id));
      await forgetFingerprints(id);
    }

    expect((await readPost(apiKey, clean)).hasUnpublishedChanges).toBe(false);
    expect((await readPost(apiKey, edited)).hasUnpublishedChanges).toBe(true);
  });
});

describe("discarding Unpublished Changes", () => {
  it("restores the published content, Category and Tags, and leaves a revision", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, otherCategory, tag, otherTag } =
      await seedTaxonomy("uc-discard");
    const id = await createPost(apiKey, "uc-discard");
    await patchPost(apiKey, id, { categoryId: category.id, summary: "kept" });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    const published = await readPost(apiKey, id);

    await patchPost(apiKey, id, {
      title: "uc-discard edited",
      summary: "edited",
      contentJson: paragraph("edited body"),
      categoryId: otherCategory.id,
    });
    await setTags(apiKey, id, [otherTag.id]);
    const edited = await readPost(apiKey, id);
    expect(edited.hasUnpublishedChanges).toBe(true);
    const reasonsBefore = await revisionReasons(apiKey, id);

    const response = await discard(apiKey, id, edited.saveToken);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      saveToken: string;
    };
    expect(body.success).toBe(true);
    expect(body.saveToken).not.toBe(edited.saveToken);

    const after = await readPost(apiKey, id);
    expect(after.saveToken).toBe(body.saveToken);
    expect(after.hasUnpublishedChanges).toBe(false);
    expect(after.title).toBe(published.title);
    expect(after.summary).toBe("kept");
    expect(after.slug).toBe(published.slug);
    expect(after.contentJson).toEqual(published.contentJson);
    expect(after.categoryId).toBe(category.id);
    expect(after.tags.map((t) => t.id)).toEqual([tag.id]);

    const reasonsAfter = await revisionReasons(apiKey, id);
    expect(reasonsAfter).toHaveLength(reasonsBefore.length + 1);
    expect(reasonsAfter[0]).toBe("restore_backup");
    const revisions = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}/revisions`)
    ).json()) as Array<{ id: number; reason: string }>;
    const backup = (await (
      await callAdminApi(
        apiKey,
        `/admin/posts/${id}/revisions/${revisions[0].id}`,
      )
    ).json()) as { snapshotJson: { title: string; categoryId: number } };
    expect(backup.snapshotJson.title).toBe("uc-discard edited");
    expect(backup.snapshotJson.categoryId).toBe(otherCategory.id);
  });

  it("works without a saveToken", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-discard-open");
    await publish(apiKey, id);
    await patchPost(apiKey, id, { title: "uc-discard-open edited" });

    expect((await discard(apiKey, id)).status).toBe(200);
    expect((await readPost(apiKey, id)).title).toBe("uc-discard-open");
  });

  it("leaves what is public alone", async () => {
    const apiKey = await seedAdminApiKey();
    const { db } = createAdminTestContext();
    const id = await createPost(apiKey, "uc-discard-public");
    await publish(apiKey, id);
    const [before] = await db
      .select({ snapshot: PostsTable.publicSnapshotJson })
      .from(PostsTable)
      .where(eq(PostsTable.id, id));
    await patchPost(apiKey, id, { title: "uc-discard-public edited" });

    await discard(apiKey, id);

    const [after] = await db
      .select({ snapshot: PostsTable.publicSnapshotJson })
      .from(PostsTable)
      .where(eq(PostsTable.id, id));
    expect(after.snapshot).toEqual(before.snapshot);
  });

  it("answers 409 EDIT_CONFLICT for a stale saveToken and writes nothing", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-discard-stale");
    await publish(apiKey, id);
    const stale = (
      await patchPost(apiKey, id, { title: "uc-discard-stale first edit" })
    ).saveToken;
    const current = await patchPost(apiKey, id, {
      title: "uc-discard-stale second edit",
    });
    const reasonsBefore = await revisionReasons(apiKey, id);

    const response = await discard(apiKey, id, stale);

    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code: string;
      data: { saveToken: string };
    };
    expect(body.code).toBe("EDIT_CONFLICT");
    expect(body.data.saveToken).toBe(current.saveToken);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("uc-discard-stale second edit");
    expect(after.saveToken).toBe(current.saveToken);
    expect(after.hasUnpublishedChanges).toBe(true);
    expect(await revisionReasons(apiKey, id)).toEqual(reasonsBefore);
  });

  it("answers 409 POST_NOT_PUBLISHED for a draft post", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-discard-draft");

    const response = await discard(apiKey, id);

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe(
      "POST_NOT_PUBLISHED",
    );
    expect(await revisionReasons(apiKey, id)).toEqual([]);
  });

  it("answers 409 NO_UNPUBLISHED_CHANGES when the draft already matches", async () => {
    const apiKey = await seedAdminApiKey();
    const id = await createPost(apiKey, "uc-discard-clean");
    await publish(apiKey, id);
    const reasonsBefore = await revisionReasons(apiKey, id);

    const response = await discard(apiKey, id);

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe(
      "NO_UNPUBLISHED_CHANGES",
    );
    expect(await revisionReasons(apiKey, id)).toEqual(reasonsBefore);
  });

  it("answers 404 POST_NOT_FOUND for a missing post", async () => {
    const apiKey = await seedAdminApiKey();

    const response = await discard(apiKey, 987654);

    expect(response.status).toBe(404);
    expect(((await response.json()) as { code: string }).code).toBe(
      "POST_NOT_FOUND",
    );
  });

  it("leaves out a Category and Tag deleted since publishing", async () => {
    const apiKey = await seedAdminApiKey();
    const context = createAdminTestContext();
    const { category, tag, otherTag } = await seedTaxonomy("uc-discard-gone");
    const id = await createPost(apiKey, "uc-discard-gone");
    await patchPost(apiKey, id, { categoryId: category.id });
    await setTags(apiKey, id, [tag.id, otherTag.id]);
    await publish(apiKey, id);
    await CategoryService.deleteCategory(context, { id: category.id });
    await TagService.deleteTag(context, { id: tag.id });
    await patchPost(apiKey, id, { title: "uc-discard-gone edited" });

    const response = await discard(apiKey, id);

    expect(response.status).toBe(200);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("uc-discard-gone");
    expect(after.categoryId).toBeNull();
    expect(after.tags.map((t) => t.id)).toEqual([otherTag.id]);
    expect(after.hasUnpublishedChanges).toBe(false);
  });

  it("still works once every Post Revision is deleted, code blocks included", async () => {
    const apiKey = await seedAdminApiKey();
    const { category, tag } = await seedTaxonomy("uc-discard-norev");
    const id = await createPost(apiKey, "uc-discard-norev");
    const body = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "intro" }] },
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const answer = 42;" }],
        },
        {
          type: "codeBlock",
          content: [{ type: "text", text: "no attributes" }],
        },
      ],
    };
    await patchPost(apiKey, id, {
      contentJson: body,
      summary: "kept",
      categoryId: category.id,
    });
    await setTags(apiKey, id, [tag.id]);
    await publish(apiKey, id);
    const published = await readPost(apiKey, id);
    await patchPost(apiKey, id, {
      title: "uc-discard-norev edited",
      contentJson: paragraph("edited body"),
      categoryId: null,
    });
    await setTags(apiKey, id, []);

    const revisions = (await (
      await callAdminApi(apiKey, `/admin/posts/${id}/revisions`)
    ).json()) as Array<{ id: number }>;
    expect(revisions.length).toBeGreaterThan(0);
    const removed = await callAdminApi(apiKey, `/admin/posts/${id}/revisions`, {
      method: "DELETE",
      body: { revisionIds: revisions.map((revision) => revision.id) },
    });
    expect(removed.status).toBe(200);
    expect(await revisionReasons(apiKey, id)).toEqual([]);

    const response = await discard(apiKey, id);

    expect(response.status).toBe(200);
    const after = await readPost(apiKey, id);
    expect(after.title).toBe("uc-discard-norev");
    expect(after.summary).toBe("kept");
    expect(after.slug).toBe(published.slug);
    expect(after.contentJson).toEqual(published.contentJson);
    expect(after.contentJson).toEqual(body);
    expect(after.categoryId).toBe(category.id);
    expect(after.tags.map((t) => t.id)).toEqual([tag.id]);
    expect(after.hasUnpublishedChanges).toBe(false);
    // The discarded draft is kept as a revision, as always.
    expect(await revisionReasons(apiKey, id)).toEqual(["restore_backup"]);
  });
});
