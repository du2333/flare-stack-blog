import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { TagsTable } from "@/lib/db/schema";

// Date fields need to accept both Date objects and ISO strings (for JSON serialization)
const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const TagSelectSchema = createSelectSchema(TagsTable, {
  createdAt: coercedDate,
});
export const TagInsertSchema = createInsertSchema(TagsTable);
export const TagUpdateSchema = createUpdateSchema(TagsTable);

export const TagWithCountSchema = TagSelectSchema.extend({
  postCount: z.number(),
});

// API Input Schemas
export const CreateTagInputSchema = z.object({
  name: z.string().min(1).max(50),
});

export const UpdateTagInputSchema = z.object({
  id: z.number(),
  data: z.object({
    name: z.string().min(1).max(50).optional(),
  }),
});

export const DeleteTagInputSchema = z.object({
  id: z.number(),
});

export const GetTagsInputSchema = z.object({
  sortBy: z.enum(["name", "createdAt", "postCount"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  withCount: z.boolean().optional(),
  publicOnly: z.boolean().optional(),
});

export const SetPostTagsInputSchema = z.object({
  postId: z.number(),
  tagIds: z.array(z.number()),
});

export const GetTagsByPostIdInputSchema = z.object({
  postId: z.number(),
});

export const GenerateTagsInputSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  content: z.string().optional(),
  existingTags: z.array(z.string()),
});

// Type exports
export type Tag = z.infer<typeof TagSelectSchema>;
export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type DeleteTagInput = z.infer<typeof DeleteTagInputSchema>;
export type GetTagsInput = z.infer<typeof GetTagsInputSchema>;
export type SetPostTagsInput = z.infer<typeof SetPostTagsInputSchema>;
export type GetTagsByPostIdInput = z.infer<typeof GetTagsByPostIdInputSchema>;
export type TagWithCount = z.infer<typeof TagWithCountSchema>;
export type GenerateTagsInput = z.infer<typeof GenerateTagsInputSchema>;

export const TAGS_CACHE_KEYS = {
  publicList: ["public", "tags", "list"] as const,
} as const;
