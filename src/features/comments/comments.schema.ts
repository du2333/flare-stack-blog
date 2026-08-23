import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import type { CommentStatus } from "@/lib/db/schema";
import { CommentsTable } from "@/lib/db/schema";

// Date fields need to accept both Date objects and ISO strings (for JSON serialization)
const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const CommentSelectSchema = createSelectSchema(CommentsTable, {
  createdAt: coercedDate,
  updatedAt: coercedDate,
});
export const CommentInsertSchema = createInsertSchema(CommentsTable);
export const CommentUpdateSchema = createUpdateSchema(CommentsTable);

// User info schema for joined queries
export const CommentUserSchema = z.object({
  id: z.string().nullable(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  role: z.string().nullable(),
});

export const CommentWithUserSchema = CommentSelectSchema.extend({
  user: CommentUserSchema.nullable(),
  post: z
    .object({
      title: z.string().optional().nullable(),
      slug: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
  replyToUser: z
    .object({
      id: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
    })
    .nullable()
    .optional(),
});

// Public API Schemas
export const GetCommentsByPostIdInputSchema = z.object({
  postId: z.number(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const GetRepliesByRootIdInputSchema = z.object({
  postId: z.number(),
  rootId: z.number(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export const ReplyWithUserAndReplyToSchema = CommentWithUserSchema.extend({
  replyTo: z
    .object({
      id: z.string().nullable(),
      name: z.string().nullable(),
    })
    .nullable(),
});

export const GetRepliesResponseSchema = z.object({
  items: z.array(ReplyWithUserAndReplyToSchema),
  total: z.number(),
});

export const RootCommentWithReplyCountSchema = CommentWithUserSchema.extend({
  replyCount: z.number(),
  replies: z.array(ReplyWithUserAndReplyToSchema),
});

export const GetRootCommentsResponseSchema = z.object({
  items: z.array(RootCommentWithReplyCountSchema),
  total: z.number(),
});

// Authed User API Schemas
export const CommentBodySchema = z.string().trim().min(1);

export const CreateCommentInputSchema = z.object({
  postId: z.number(),
  content: CommentBodySchema,
  rootId: z.number().optional(),
  replyToCommentId: z.number().optional(),
});

export const DeleteCommentInputSchema = z.object({
  id: z.number(),
});

export const GetThreadByCommentIdInputSchema = z.object({
  postId: z.number(),
  id: z.number(),
});

export const GetMyCommentsInputSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  status: z.custom<CommentStatus>().optional(),
});

// Types
export type GetCommentsByPostIdInput = z.infer<
  typeof GetCommentsByPostIdInputSchema
>;
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;
export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;
export type GetMyCommentsInput = z.infer<typeof GetMyCommentsInputSchema>;
export type RootCommentWithReplyCount = z.infer<
  typeof RootCommentWithReplyCountSchema
>;
export type CommentWithUser = z.infer<typeof CommentWithUserSchema>;
