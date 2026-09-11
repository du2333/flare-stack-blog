import { describe, expect, it } from "vitest";
import { createTestContext } from "tests/test-utils";
import {
  CategoriesTable,
  PostsTable,
  PostTagsTable,
  TagsTable,
  type PublicPostSnapshot,
} from "@/lib/db/schema";
import * as Categories from "@/features/categories/categories.service";
import * as Tags from "@/features/tags/tags.service";
import * as TagRepo from "@/features/tags/data/tags.data";
import * as CategoryRepo from "@/features/categories/data/categories.data";
import * as Posts from "@/features/posts/services/posts.service";

function snapshot(
  categoryId: number | null,
  tagIds: number[],
  title: string,
  slug: string,
  day = 1,
): PublicPostSnapshot {
  return {
    categoryId,
    tagIds,
    title,
    slug,
    summary: null,
    contentJson: null,
    publishedAt: `2026-09-0${day}T12:00:00Z`,
    pinnedAt: null,
    cover: null,
  };
}

describe("Admin taxonomy scopes", () => {
  it("uses identical count/list membership for current and public scopes, including overlapping sets and duplicate snapshot tags", async () => {
    const context = createTestContext();
    const db = context.db;
    const [a, b] = await db
      .insert(CategoriesTable)
      .values([{ name: "A" }, { name: "B" }])
      .returning();
    const [tagA, tagB] = await db
      .insert(TagsTable)
      .values([{ name: "A" }, { name: "B" }])
      .returning();
    const [moved, draft, shared] = await db
      .insert(PostsTable)
      .values([
        {
          title: "Edited title",
          slug: "edited",
          categoryId: b.id,
          status: "published",
          publishedAt: new Date("2026-09-10"),
          publicSlug: "public",
          publicSnapshotJson: snapshot(
            a.id,
            [tagA.id, tagA.id],
            "Public %_ title",
            "public",
          ),
        },
        {
          title: "Draft title",
          slug: "draft",
          categoryId: a.id,
          status: "draft",
        },
        {
          title: "Shared editable",
          slug: "shared",
          categoryId: a.id,
          status: "published",
          publishedAt: new Date("2026-09-01"),
          publicSlug: "shared-public",
          publicSnapshotJson: snapshot(
            a.id,
            [tagA.id],
            "Shared public",
            "shared-public",
            2,
          ),
        },
      ])
      .returning();
    await db.insert(PostTagsTable).values([
      { postId: moved.id, tagId: tagB.id },
      { postId: draft.id, tagId: tagA.id },
      { postId: shared.id, tagId: tagA.id },
    ]);
    const categories = await Categories.getCategories(context);
    expect(categories.items.find((item) => item.id === a.id)).toMatchObject({
      postCount: 2,
      publicPostCount: 2,
    });
    expect(categories.items.find((item) => item.id === b.id)).toMatchObject({
      postCount: 1,
      publicPostCount: 0,
    });
    const tags = await Tags.getTagsWithCount(context);
    expect(tags.find((item) => item.id === tagA.id)).toMatchObject({
      postCount: 2,
      publicPostCount: 2,
    });
    for (const [kind, id] of [
      ["category", a.id],
      ["tag", tagA.id],
    ] as const) {
      const current = await Posts.listAdminPostsPage(context, {
        taxonomy: { kind, id, scope: "current" },
      });
      expect(current.items.map((item) => item.id).sort()).toEqual(
        [draft.id, shared.id].sort(),
      );
      expect(current.statusCounts).toEqual({ draft: 1, published: 1 });
      expect(current.total).toBe(2);
      const published = await Posts.listAdminPostsPage(context, {
        taxonomy: { kind, id, scope: "public" },
        sortBy: "publishedAt",
        sortDir: "DESC",
      });
      expect(published.items.map((item) => item.id)).toEqual([
        shared.id,
        moved.id,
      ]);
      expect(published.items[1]).toMatchObject({
        title: "Public %_ title",
        slug: "public",
        publishedAt: new Date("2026-09-01T12:00:00Z"),
      });
      expect(published.statusCounts).toEqual({ draft: 0, published: 2 });
      expect(published.total).toBe(2);
      const page = await Posts.listAdminPostsPage(context, {
        taxonomy: { kind, id, scope: "public" },
        limit: 1,
        offset: 1,
      });
      expect(page.items).toHaveLength(1);
      expect(page.total).toBe(2);
      const search = await Posts.listAdminPostsPage(context, {
        taxonomy: { kind, id, scope: "public" },
        search: "%_",
      });
      expect(search.total).toBe(1);
      expect(search.items[0].id).toBe(moved.id);
      expect(
        await Posts.getPostsCount(context, {
          taxonomy: { kind, id, scope: "public" },
        }),
      ).toBe(2);
    }
    expect(
      (await TagRepo.getPublishedPostsByTagId(db, tagA.id))
        .map((item) => item.id)
        .sort(),
    ).toEqual([moved.id, shared.id].sort());
  });
  it("counts and lists missing public categories as uncategorized without counting drafts as public", async () => {
    const context = createTestContext();
    const db = context.db;
    const [category] = await db
      .insert(CategoriesTable)
      .values({ name: "Deleted" })
      .returning();
    const [published, draft] = await db
      .insert(PostsTable)
      .values([
        {
          title: "Public",
          slug: "public",
          categoryId: category.id,
          status: "published",
          publicSnapshotJson: snapshot(category.id, [], "Public", "public"),
        },
        { title: "Draft", slug: "draft", status: "draft" },
      ])
      .returning();
    await CategoryRepo.deleteCategory(db, category.id);
    const counts = await Categories.getCategories(context);
    expect(counts.uncategorizedPostCount).toBe(2);
    expect(counts.uncategorizedPublicPostCount).toBe(1);
    const current = await Posts.listAdminPostsPage(context, {
      taxonomy: { kind: "uncategorized", scope: "current" },
    });
    expect(current.items.map((item) => item.id).sort()).toEqual(
      [published.id, draft.id].sort(),
    );
    const publicUse = await Posts.listAdminPostsPage(context, {
      taxonomy: { kind: "uncategorized", scope: "public" },
    });
    expect(publicUse.items.map((item) => item.id)).toEqual([published.id]);
    expect(publicUse.total).toBe(1);
  });
});
