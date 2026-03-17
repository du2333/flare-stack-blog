import {
  createAdminTestContext,
  seedUser,
  waitForBackgroundTasks,
} from "tests/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import * as TagService from "@/features/tags/tags.service";
import { PostRevisionsTable } from "@/lib/db/schema";
import { unwrap } from "@/lib/errors";

describe("PostRevisionService", () => {
  let adminContext: ReturnType<typeof createAdminTestContext>;

  beforeEach(async () => {
    adminContext = createAdminTestContext();
    await seedUser(adminContext.db, adminContext.session.user);
  });

  const updatePost = async (
    input: Parameters<typeof PostService.updatePost>[1],
  ) => unwrap(await PostService.updatePost(adminContext, input));

  it("creates an auto revision from the current post snapshot", async () => {
    const tag = unwrap(
      await TagService.createTag(adminContext, { name: "revision-tag" }),
    );
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Versioned Post",
        summary: "Snapshot summary",
        slug: "versioned-post",
        readTimeInMinutes: 3,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello revision history" }],
            },
          ],
        },
      },
    });
    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [tag.id],
    });

    const revision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
      }),
    );

    expect(revision.created).toBe(true);
    expect(revision.revision?.reason).toBe("auto");
    expect(revision.revision?.snapshotJson).toEqual({
      title: "Versioned Post",
      summary: "Snapshot summary",
      slug: "versioned-post",
      status: "draft",
      publishedAt: null,
      readTimeInMinutes: 3,
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello revision history" }],
          },
        ],
      },
      tagIds: [tag.id],
    });
  });

  it("lists revisions in reverse chronological order", async () => {
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "First Version",
        slug: "first-version",
      },
    });
    const firstRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
        reason: "publish",
      }),
    );

    await updatePost({
      id,
      data: {
        title: "Second Version",
        slug: "second-version",
      },
    });
    const secondRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
        reason: "publish",
      }),
    );

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );

    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.id).toBe(secondRevision.revision?.id);
    expect(revisions[0]?.title).toBe("Second Version");
    expect(revisions[1]?.id).toBe(firstRevision.revision?.id);
    expect(revisions[1]?.title).toBe("First Version");
  });

  it("restores a revision and creates a restore backup from the current state", async () => {
    const originalTag = unwrap(
      await TagService.createTag(adminContext, { name: "original-tag" }),
    );
    const updatedTag = unwrap(
      await TagService.createTag(adminContext, { name: "updated-tag" }),
    );
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Original Title",
        summary: "Original Summary",
        slug: "original-title",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Original content" }],
            },
          ],
        },
      },
    });
    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [originalTag.id],
    });

    const originalRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
      }),
    );

    await updatePost({
      id,
      data: {
        title: "Updated Title",
        summary: "Updated Summary",
        slug: "updated-title",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Updated content" }],
            },
          ],
        },
      },
    });
    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [updatedTag.id],
    });

    const restoreResult = unwrap(
      await PostRevisionService.restorePostRevision(adminContext, {
        postId: id,
        revisionId: originalRevision.revision!.id,
      }),
    );
    await waitForBackgroundTasks(adminContext.executionCtx);

    expect(restoreResult.restored).toBe(true);
    expect(restoreResult.post.title).toBe("Original Title");
    expect(restoreResult.post.summary).toBe("Original Summary");
    expect(restoreResult.post.slug).toBe("original-title");
    expect(restoreResult.post.tags.map((tag) => tag.id)).toEqual([
      originalTag.id,
    ]);
    expect(restoreResult.post.contentJson).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Original content" }],
        },
      ],
    });

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.reason).toBe("restore_backup");
    expect(revisions[0]?.restoredFromRevisionId).toBe(
      originalRevision.revision!.id,
    );
    expect(revisions[0]?.title).toBe("Updated Title");
    expect(revisions[1]?.id).toBe(originalRevision.revision!.id);
  });

  it("does not create a restore backup when the target revision matches the current post", async () => {
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Stable Title",
        slug: "stable-title",
      },
    });

    const revision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: id,
      }),
    );

    const restoreResult = unwrap(
      await PostRevisionService.restorePostRevision(adminContext, {
        postId: id,
        revisionId: revision.revision!.id,
      }),
    );

    expect(restoreResult.restored).toBe(false);

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.id).toBe(revision.revision?.id);
  });

  it("deletes multiple revisions for the current post only", async () => {
    const { id: firstPostId } = await PostService.createEmptyPost(adminContext);
    const { id: secondPostId } =
      await PostService.createEmptyPost(adminContext);

    await updatePost({
      id: firstPostId,
      data: {
        title: "First post v1",
        slug: "first-post-v1",
      },
    });
    const firstRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: firstPostId,
        reason: "publish",
      }),
    );

    await updatePost({
      id: firstPostId,
      data: {
        title: "First post v2",
        slug: "first-post-v2",
      },
    });
    const secondRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: firstPostId,
        reason: "publish",
      }),
    );

    await updatePost({
      id: secondPostId,
      data: {
        title: "Second post v1",
        slug: "second-post-v1",
      },
    });
    const untouchedRevision = unwrap(
      await PostRevisionService.createPostRevision(adminContext, {
        postId: secondPostId,
        reason: "publish",
      }),
    );

    const result = unwrap(
      await PostRevisionService.deletePostRevisions(adminContext, {
        postId: firstPostId,
        revisionIds: [
          firstRevision.revision!.id,
          secondRevision.revision!.id,
          untouchedRevision.revision!.id,
        ],
      }),
    );

    expect(result.deletedCount).toBe(2);
    expect(result.deletedIds.sort((a, b) => a - b)).toEqual(
      [firstRevision.revision!.id, secondRevision.revision!.id].sort(
        (a, b) => a - b,
      ),
    );

    const firstPostRevisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: firstPostId,
      },
    );
    const secondPostRevisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: secondPostId,
      },
    );

    expect(firstPostRevisions).toHaveLength(0);
    expect(secondPostRevisions).toHaveLength(1);
    expect(secondPostRevisions[0]?.id).toBe(untouchedRevision.revision!.id);
  });

  it("creates a publish revision when starting the publish workflow", async () => {
    const tag = unwrap(
      await TagService.createTag(adminContext, { name: "publish-tag" }),
    );
    const { id } = await PostService.createEmptyPost(adminContext);
    const publishedAt = new Date("2026-03-14T10:00:00.000Z");

    await updatePost({
      id,
      data: {
        title: "Published Revision",
        summary: "Before workflow",
        slug: "published-revision",
        status: "published",
        publishedAt,
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Published body" }],
            },
          ],
        },
      },
    });
    await TagService.setPostTags(adminContext, {
      postId: id,
      tagIds: [tag.id],
    });

    await PostService.startPostProcessWorkflow(adminContext, {
      id,
      status: "published",
      clientToday: "2026-03-14",
    });

    const revisions = await PostRevisionService.listPostRevisions(
      adminContext,
      {
        postId: id,
      },
    );

    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.reason).toBe("publish");

    const revision = await PostRevisionService.findPostRevisionById(
      adminContext,
      {
        postId: id,
        revisionId: revisions[0]!.id,
      },
    );
    expect(revision?.snapshotJson).toEqual({
      title: "Published Revision",
      summary: "Before workflow",
      slug: "published-revision",
      status: "published",
      publishedAt: publishedAt.toISOString(),
      readTimeInMinutes: 1,
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Published body" }],
          },
        ],
      },
      tagIds: [tag.id],
    });
  });

  it("returns an error when restoring a revision with an invalid snapshot", async () => {
    const { id } = await PostService.createEmptyPost(adminContext);

    await updatePost({
      id,
      data: {
        title: "Current Title",
        slug: "current-title",
      },
    });

    const [invalidRevision] = await adminContext.db
      .insert(PostRevisionsTable)
      .values({
        postId: id,
        reason: "auto",
        snapshotHash: "invalid-hash",
        snapshotJson: {
          title: "Broken Snapshot",
        } as never,
      })
      .returning();

    const result = await PostRevisionService.restorePostRevision(adminContext, {
      postId: id,
      revisionId: invalidRevision.id,
    });

    expect(result.error?.reason).toBe("POST_REVISION_INVALID_SNAPSHOT");
  });
});
