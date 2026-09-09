import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { PublicCategorySchema } from "@/features/categories/categories.schema";
import { TagSelectSchema } from "@/features/tags/tags.schema";
import type { PostStatus } from "@/lib/db/schema";
import { PostsTable } from "@/lib/db/schema";
import { NullableJsonContentSchema } from "./json-content.schema";

// Date fields need to accept both Date objects and ISO strings (for JSON serialization)
const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);
const coercedDateNullable = coercedDate.nullable();

const PublicPostCoverSchema = z.object({
  key: z.string(),
  url: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
});

const AdminPostCoverSchema = PublicPostCoverSchema.extend({
  id: z.number().int(),
  fileName: z.string(),
});

const PostSelectSchema = createSelectSchema(PostsTable, {
  publishedAt: coercedDateNullable,
  pinnedAt: coercedDateNullable,
  createdAt: coercedDate,
  updatedAt: coercedDate,
}).omit({
  publicSnapshotJson: true,
});
const PostUpdateSchema = createUpdateSchema(PostsTable, {
  contentJson: NullableJsonContentSchema.optional(),
}).omit({
  publicSnapshotJson: true,
  publicSlug: true,
  status: true,
});

export const PostItemSchema = PostSelectSchema.omit({
  contentJson: true,
  publicSlug: true,
  coverMediaId: true,
  categoryId: true,
}).extend({
  tags: z.array(TagSelectSchema).optional(),
  category: PublicCategorySchema.nullable().catch(null),
  readTimeInMinutes: z.number().int().min(1),
  viewCount: z.number().int().nonnegative().optional(),
  cover: PublicPostCoverSchema.nullable().catch(null),
});
export const PostListResponseSchema = z.object({
  items: z.array(PostItemSchema),
  nextCursor: z.number().nullable(),
});
export const PostWithTocSchema = PostSelectSchema.omit({
  publicSlug: true,
  coverMediaId: true,
  categoryId: true,
})
  .extend({
    tags: z.array(TagSelectSchema).optional(),
    category: PublicCategorySchema.nullable().catch(null),
    readTimeInMinutes: z.number().int().min(1),
    toc: z.array(
      z.object({
        id: z.string(),
        text: z.string(),
        level: z.number(),
      }),
    ),
    cover: PublicPostCoverSchema.nullable().catch(null),
  })
  .nullable();

export const AdminPostSchema = PostSelectSchema.omit({
  publicSlug: true,
})
  .extend({
    tags: z.array(TagSelectSchema).optional(),
    hasPublicSnapshot: z.boolean(),
    serverToday: z.string(),
    cover: AdminPostCoverSchema.nullable(),
  })
  .nullable();

export function normalizePostTagName(
  tagName: string | undefined,
): string | undefined {
  return tagName === "" ? undefined : tagName;
}

export function normalizePostCategoryName(
  categoryName: string | undefined,
): string | undefined {
  return categoryName === "" ? undefined : categoryName;
}

export const PostTagNameSchema = z
  .string()
  .transform(normalizePostTagName)
  .optional();

export const PostCategoryNameSchema = z
  .string()
  .transform(normalizePostCategoryName)
  .optional();

export const GetPostsCursorInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  tagName: PostTagNameSchema,
  categoryName: PostCategoryNameSchema,
  uncategorized: z.boolean().optional(),
  excludePinned: z.boolean().optional(),
});

export const FindPostBySlugInputSchema = z.object({
  slug: z.string(),
});

export const AdjacentPublicPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
});

export const AdjacentPostsSchema = z.object({
  newer: AdjacentPublicPostSchema.nullable(),
  older: AdjacentPublicPostSchema.nullable(),
});

export type GetPostsCursorInput = z.infer<typeof GetPostsCursorInputSchema>;
export type FindPostBySlugInput = z.infer<typeof FindPostBySlugInputSchema>;
export type AdjacentPosts = z.infer<typeof AdjacentPostsSchema>;

// Admin API Schemas
export const GenerateSlugInputSchema = z.object({
  title: z.string().optional(),
  excludeId: z.number().optional(),
});

export const GetPostsInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.custom<PostStatus>().optional(),
  publicOnly: z.boolean().optional(),
  search: z.string().optional(),
  sortDir: z.enum(["ASC", "DESC"]).optional(),
  sortBy: z.enum(["publishedAt", "updatedAt"]).optional(),
});

const GetPostsCountInputSchema = GetPostsInputSchema.omit({
  offset: true,
  limit: true,
  sortDir: true,
});

const AdminPostListItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  summary: z.string().nullable(),
  slug: z.string(),
  status: z.enum(["draft", "published"]),
  publishedAt: coercedDateNullable,
  pinnedAt: coercedDateNullable,
  createdAt: coercedDate,
  updatedAt: coercedDate,
});

export const AdminPostStatusCountsSchema = z.object({
  draft: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
});
export type AdminPostStatusCounts = z.infer<typeof AdminPostStatusCountsSchema>;

export const AdminPostListPageSchema = z.object({
  items: z.array(AdminPostListItemSchema),
  total: z.number().int().nonnegative(),
  statusCounts: AdminPostStatusCountsSchema.describe(
    "Counts matching search and publicOnly before status filtering or pagination.",
  ),
});

export const FindPostByIdInputSchema = z.object({ id: z.number() });

export const UpdatePostInputSchema = z.object({
  id: z.number(),
  data: PostUpdateSchema,
});

export const DeletePostInputSchema = z.object({ id: z.number() });

export const PublishPostInputSchema = z.object({
  id: z.number(),
});

export const UnpublishPostInputSchema = z.object({
  id: z.number(),
});

export type GenerateSlugInput = z.infer<typeof GenerateSlugInputSchema>;
export type GetPostsInput = z.infer<typeof GetPostsInputSchema>;
export type GetPostsCountInput = z.infer<typeof GetPostsCountInputSchema>;
export type FindPostByIdInput = z.infer<typeof FindPostByIdInputSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;
export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;
export type PublishPostInput = z.infer<typeof PublishPostInputSchema>;
export type UnpublishPostInput = z.infer<typeof UnpublishPostInputSchema>;
export type PostListItem = PostItem;
export type PostItem = z.infer<typeof PostItemSchema>;
export type PostWithToc = z.infer<typeof PostWithTocSchema>;
