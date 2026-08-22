import { invalidate } from "@/features/cache/public-cache";
import * as PostRepo from "@/features/posts/data/posts.data";

import * as TagRepo from "@/features/tags/data/tags.data";
import { publicTagList } from "@/features/tags/tags.cache";
import type {
  CreateTagInput,
  DeleteTagInput,
  GetTagsByPostIdInput,
  GetTagsInput,
  SetPostTagsInput,
  Tag,
  TagWithCount,
  UpdateTagInput,
} from "@/features/tags/tags.schema";
import { err, ok } from "@/lib/errors";

/**
 * Get all tags (cached)
 */
export async function getTags(
  context: DbContext,
  data: GetTagsInput = {},
): Promise<Array<Tag | TagWithCount>> {
  const {
    sortBy = "name",
    sortDir = "asc",
    withCount = false,
    publicOnly = false,
  } = data;

  if (withCount) {
    return await TagRepo.getAllTagsWithCount(context.db, {
      sortBy,
      sortDir,
      publicOnly,
    });
  }
  return await TagRepo.getAllTags(context.db, {
    sortBy: sortBy === "postCount" ? "name" : sortBy,
    sortDir,
  });
}

/**
 * Get public tags list (KV-only, populated by publish workflow)
 * This ensures public site only shows "published" tag associations.
 */
export async function getPublicTags(
  context: DbContext & {
    executionCtx: ExecutionContext;
  },
) {
  return publicTagList.get(context, {});
}

/**
 * Get all tags with counts
 */
export async function getTagsWithCount(
  context: DbContext,
  data: GetTagsInput = {},
) {
  // We don't cache this for now as it's for admin management
  return await TagRepo.getAllTagsWithCount(context.db, data);
}

/**
 * Get tags for a specific post
 */
export async function getTagsByPostId(
  context: DbContext,
  data: GetTagsByPostIdInput,
) {
  return await TagRepo.getTagsByPostId(context.db, data.postId);
}

// ============ Admin Service Methods ============

/**
 * Create a new tag
 */

async function invalidateTagRelatedCache(
  context: DbContext,
  affectedPosts: Array<{ id: number; slug: string }>,
) {
  await invalidate.tagChanged(context, {
    slugs: affectedPosts.map((post) => post.slug),
  });
}

export const createTag = async (context: DbContext, data: CreateTagInput) => {
  const exists = await TagRepo.nameExists(context.db, data.name);
  if (exists) {
    return err({ reason: "TAG_NAME_ALREADY_EXISTS" });
  }

  const tag = await TagRepo.insertTag(context.db, {
    name: data.name,
  });

  return ok(tag);
};

/**
 * Update a tag
 */
export async function updateTag(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdateTagInput,
) {
  const existingTag = await TagRepo.findTagById(context.db, data.id);
  if (!existingTag) {
    return err({ reason: "TAG_NOT_FOUND" });
  }

  if (data.data.name && data.data.name !== existingTag.name) {
    const exists = await TagRepo.nameExists(context.db, data.data.name, {
      excludeId: data.id,
    });
    if (exists) {
      return err({ reason: "TAG_NAME_ALREADY_EXISTS" });
    }
  }

  const affectedPosts = await TagRepo.getPublishedPostsByTagId(
    context.db,
    data.id,
  );

  const tag = await TagRepo.updateTag(context.db, data.id, data.data);

  context.executionCtx.waitUntil(
    invalidateTagRelatedCache(context, affectedPosts),
  );

  return ok(tag);
}

/**
 * Delete a tag
 */
export async function deleteTag(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteTagInput,
) {
  const tag = await TagRepo.findTagById(context.db, data.id);
  if (!tag) {
    return err({ reason: "TAG_NOT_FOUND" });
  }

  // Fetch published posts associated with this tag BEFORE deleting
  const affectedPosts = await TagRepo.getPublishedPostsByTagId(
    context.db,
    data.id,
  );

  await TagRepo.deleteTag(context.db, data.id);

  context.executionCtx.waitUntil(
    invalidateTagRelatedCache(context, affectedPosts),
  );

  return ok({ success: true });
}

/**
 * Set tags for a post (edit only, no cache invalidation)
 *
 * 编辑页面改标签只影响 DB，不触发 KV 变化。
 * KV 只在"发布"时刷新。
 */
export async function setPostTags(context: DbContext, data: SetPostTagsInput) {
  await TagRepo.setPostTags(context.db, data.postId, data.tagIds);
  await PostRepo.touchPostUpdatedAt(context.db, data.postId);
}
