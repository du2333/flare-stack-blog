import { z } from "zod";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { Post, PostStatus, Tag } from "@/lib/db/schema";
import { POST_STATUSES, PostsTable } from "@/lib/db/schema";
import { TagSelectSchema } from "@/features/tags/tags.schema";

// Date fields need to accept both Date objects and ISO strings (for JSON serialization)
const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);
const coercedDateNullable = coercedDate.nullable();

export const PostSelectSchema = createSelectSchema(PostsTable, {
  publishedAt: coercedDateNullable,
  createdAt: coercedDate,
  updatedAt: coercedDate,
});
export const PostInsertSchema = createInsertSchema(PostsTable);
export const PostUpdateSchema = createUpdateSchema(PostsTable);

export const PostItemSchema = PostSelectSchema.omit({
  contentJson: true,
}).extend({
  tags: z.array(TagSelectSchema).optional(),
});
export const PostListResponseSchema = z.object({
  items: z.array(PostItemSchema),
  nextCursor: z.number().nullable(),
});
export const PostWithTocSchema = PostSelectSchema.extend({
  tags: z.array(TagSelectSchema).optional(),
  toc: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      level: z.number(),
    }),
  ),
}).nullable();

export const GetPostsCursorInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  tagName: z.string().optional(),
});

export const FindPostBySlugInputSchema = z.object({
  slug: z.string(),
});

export const FindRelatedPostsInputSchema = z.object({
  slug: z.string(),
  limit: z.number().optional(),
});

export type GetPostsCursorInput = z.infer<typeof GetPostsCursorInputSchema>;
export type FindPostBySlugInput = z.infer<typeof FindPostBySlugInputSchema>;
export type FindRelatedPostsInput = z.infer<typeof FindRelatedPostsInputSchema>;

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

export const GetPostsCountInputSchema = GetPostsInputSchema.omit({
  offset: true,
  limit: true,
  sortDir: true,
});

export const FindPostByIdInputSchema = z.object({ id: z.number() });

export const UpdatePostInputSchema = z.object({
  id: z.number(),
  data: PostUpdateSchema,
});

export const DeletePostInputSchema = z.object({ id: z.number() });

export const PreviewSummaryInputSchema = PostSelectSchema.pick({
  contentJson: true,
});

export const StartPostProcessInputSchema = z.object({
  id: z.number(),
  status: z.enum(POST_STATUSES),
});

export type GenerateSlugInput = z.infer<typeof GenerateSlugInputSchema>;
export type GetPostsInput = z.infer<typeof GetPostsInputSchema>;
export type GetPostsCountInput = z.infer<typeof GetPostsCountInputSchema>;
export type FindPostByIdInput = z.infer<typeof FindPostByIdInputSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostInputSchema>;
export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;
export type PreviewSummaryInput = z.infer<typeof PreviewSummaryInputSchema>;
export type StartPostProcessInput = z.infer<typeof StartPostProcessInputSchema>;
export type PostListItem = Omit<Post, "contentJson"> & {
  tags?: Array<Tag>;
};

export type PostListResponse = z.infer<typeof PostListResponseSchema>;
export type PostItem = z.infer<typeof PostItemSchema>;
export type PostWithToc = z.infer<typeof PostWithTocSchema>;

export const POSTS_CACHE_KEYS = {
  list: (version: string, limit: number, cursor: number, tagName: string) =>
    ["posts", "list", version, limit, cursor, tagName] as const,
  detail: (version: string, slug: string) => [version, "post", slug] as const,
  related: (slug: string, limit?: number) =>
    ["posts", "related-ids", slug, limit] as const,
  syncHash: (id: number) => `post_hash:${id}` as const,
} as const;
