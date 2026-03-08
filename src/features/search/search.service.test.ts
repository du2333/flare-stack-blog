import { describe, expect, it } from "vitest";
import { createAdminTestContext, seedUser } from "tests/test-utils";
import { remove } from "@orama/orama";
import * as SearchService from "./service/search.service";
import { PostTagsTable, PostsTable, TagsTable } from "@/lib/db/schema";
import { getOramaDb, persistOramaDb } from "@/features/search/model/store";

describe("SearchService", () => {
  it("should upsert and search for a document", async () => {
    // Arrange
    const context = createAdminTestContext();
    const doc = {
      id: 1,
      slug: "test-post",
      title: "Test Post Title",
      summary: "This is a summary of the test post.",
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "This is the content." }],
          },
        ],
      },
      tags: ["tag1", "tag2"],
    };

    // Act
    await SearchService.upsert(context, doc);

    // Assert
    const results = await SearchService.search(context, {
      q: "Title",
      v: "1",
      limit: 10,
    });
    expect(results).toHaveLength(1);
    expect(results[0].post.title).toBe(doc.title);
    expect(results[0].post.slug).toBe(doc.slug);
  });

  it("should delete a document from index", async () => {
    // Arrange
    const context = createAdminTestContext();
    const doc = {
      id: 2,
      slug: "test-post-2",
      title: "To Be Deleted",
      summary: "Summary",
      contentJson: null,
      tags: [],
    };
    await SearchService.upsert(context, doc);

    // Verify it exists
    let results = await SearchService.search(context, {
      q: "Deleted",
      v: "1",
      limit: 10,
    });
    expect(results).toHaveLength(1);

    // Act
    await SearchService.deleteIndex(context, { id: doc.id });

    // Assert
    results = await SearchService.search(context, {
      q: "Deleted",
      v: "1",
      limit: 10,
    });
    expect(results).toHaveLength(0);
  });

  it("should rebuild index from database", async () => {
    // Arrange
    const context = createAdminTestContext();
    await seedUser(context.db, context.session.user);

    // Seed DB
    const postData = {
      id: 3,
      title: "Database Post",
      slug: "db-post",
      summary: "From DB",
      contentJson: { type: "doc", content: [] }, // simplified
      publishedAt: new Date(),
      status: "published" as const,
      readTimeInMinutes: 1,
    };

    await context.db.insert(PostsTable).values(postData);

    const tagData = {
      id: 1,
      name: "dbtag",
    };
    await context.db.insert(TagsTable).values(tagData);

    await context.db.insert(PostTagsTable).values({
      postId: postData.id,
      tagId: tagData.id,
    });

    // Clear Search Index to be sure
    const db = await getOramaDb(context.env);
    try {
      await remove(db, postData.id.toString());
      await persistOramaDb(context.env, db);
    } catch {}

    // Act
    await SearchService.rebuildIndex(context);

    // Assert
    const results = await SearchService.search(context, {
      q: "Database",
      v: "1",
      limit: 10,
    });
    expect(results).toHaveLength(1);
    expect(results[0].post.title).toBe(postData.title);
    expect(results[0].post.tags).toContain("dbtag");
  });
});
