import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import {
  POST_REVISION_REASONS,
  POST_STATUSES,
  PostRevisionsTable,
} from "@/lib/db/schema";
import { NullableJsonContentSchema } from "./json-content.schema";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const PostRevisionSnapshotSchema = z.object({
  title: z.string(),
  summary: z.string().nullable(),
  slug: z.string(),
  status: z.enum(POST_STATUSES),
  publishedAt: z.string().nullable(),
  readTimeInMinutes: z.number().int().min(1),
  contentJson: NullableJsonContentSchema,
  tagIds: z.array(z.number().int()),
});

export const PostRevisionSelectSchema = createSelectSchema(PostRevisionsTable, {
  createdAt: coercedDate,
  snapshotJson: PostRevisionSnapshotSchema,
});

export const PostRevisionInsertSchema = createInsertSchema(PostRevisionsTable, {
  snapshotJson: PostRevisionSnapshotSchema,
});

export const PostRevisionUpdateSchema = createUpdateSchema(PostRevisionsTable, {
  snapshotJson: PostRevisionSnapshotSchema,
});

export const ListPostRevisionsInputSchema = z.object({
  postId: z.number(),
});

export const FindPostRevisionByIdInputSchema = z.object({
  postId: z.number(),
  revisionId: z.number(),
});

export const CreatePostRevisionInputSchema = z.object({
  postId: z.number(),
  reason: z.enum(POST_REVISION_REASONS).optional(),
});

export const RestorePostRevisionInputSchema = z.object({
  postId: z.number(),
  revisionId: z.number(),
});

export const DeletePostRevisionsInputSchema = z.object({
  postId: z.number(),
  revisionIds: z.array(z.number().int()).min(1),
});

export const PostRevisionListItemSchema = PostRevisionSelectSchema.pick({
  id: true,
  postId: true,
  reason: true,
  snapshotHash: true,
  restoredFromRevisionId: true,
  createdAt: true,
}).extend({
  title: z.string(),
  summary: z.string().nullable(),
});

export type PostRevisionSnapshot = z.infer<typeof PostRevisionSnapshotSchema>;
export type ListPostRevisionsInput = z.infer<
  typeof ListPostRevisionsInputSchema
>;
export type FindPostRevisionByIdInput = z.infer<
  typeof FindPostRevisionByIdInputSchema
>;
export type CreatePostRevisionInput = z.infer<
  typeof CreatePostRevisionInputSchema
>;
export type RestorePostRevisionInput = z.infer<
  typeof RestorePostRevisionInputSchema
>;
export type DeletePostRevisionsInput = z.infer<
  typeof DeletePostRevisionsInputSchema
>;
export type CreatePostRevisionResult = {
  created: boolean;
  revision: z.infer<typeof PostRevisionSelectSchema> | null;
  skipReason?: "UNCHANGED" | "RATE_LIMITED";
};
