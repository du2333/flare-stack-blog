import type { OpenAPIGeneratorGenerateOptions } from "@orpc/openapi";
import {
  CategoryOptionSchema,
  CategorySelectSchema,
} from "@/features/categories/categories.schema";
import {
  GetRepliesResponseSchema,
  RootCommentWithReplyCountSchema,
} from "@/features/comments/comments.schema";
import { AdminConfigSnapshotSchema } from "@/features/config/config.admin.schema";
import { UnrepliedCommentsPageSchema } from "@/features/dashboard/dashboard.schema";
import { FriendLinkSchema } from "@/features/friend-links/friend-links.schema";
import { MediaSelectSchema } from "@/features/media/media.schema";
import {
  AdminMomentSchema,
  MomentImageSchema,
  MomentVideoSchema,
  PublicMomentSchema,
} from "@/features/moments/schema/moments.schema";
import { MutedUserSchema } from "@/features/muted-users/muted-users.schema";
import { PostPopularitySyncStatusSchema } from "@/features/post-popularity/post-popularity.schema";
import { NullableJsonContentSchema } from "@/features/posts/schema/json-content.schema";
import { PostRevisionReasonSchema } from "@/features/posts/schema/post-revisions.schema";
import {
  ContentJsonInputSchema,
  ContentMarkdownInputSchema,
  ContentMarkdownOutputSchema,
  HasUnpublishedChangesSchema,
  PostContentFormatSchema,
  PostItemSchema,
  PostSummaryInputSchema,
  PostWriteResultSchema,
  PublicSlugSchema,
  SaveTokenSchema,
  StatedSaveTokenSchema,
} from "@/features/posts/schema/posts.schema";
import { TagSelectSchema } from "@/features/tags/tags.schema";
import { UpdateCheckResultSchema } from "@/features/version/version.schema";
import { coercedDate } from "./dates";

const TipTapNodeSchema = NullableJsonContentSchema.unwrap();

/**
 * Schemas the OpenAPI document defines once, in `components.schemas`, and
 * references wherever an operation uses that very zod schema, so the document
 * and the subsets an agent reads stay small. A field that wraps one
 * (`.nullable()`, `.optional()`, `.describe()`) still refers to it and keeps
 * its own description beside the `$ref`. A schema built from one with
 * `.extend()` or `.pick()` is a new schema and is written out in full.
 *
 * The entries are what several operations share. One that converts dates
 * differently on the way in and out is shared as operations return it.
 */
export const OPENAPI_COMPONENTS: NonNullable<
  OpenAPIGeneratorGenerateOptions["commonSchemas"]
> = {
  // A node of a TipTap document, whose content holds more nodes. Requests
  // and responses differ only in reading unknown array items as maybe null.
  TipTapNode: { schema: TipTapNodeSchema, strategy: "output" },
  TipTapNodeInput: { schema: TipTapNodeSchema, strategy: "input" },
  DateTime: { schema: coercedDate, strategy: "output" },
  // Post fields whose long descriptions several Post operations repeat.
  ContentFormat: { schema: PostContentFormatSchema, strategy: "input" },
  ContentMarkdown: { schema: ContentMarkdownOutputSchema, strategy: "output" },
  ContentMarkdownInput: {
    schema: ContentMarkdownInputSchema,
    strategy: "input",
  },
  ContentJsonInput: { schema: ContentJsonInputSchema, strategy: "input" },
  PostSummaryInput: { schema: PostSummaryInputSchema, strategy: "input" },
  SaveToken: { schema: SaveTokenSchema, strategy: "output" },
  StatedSaveToken: { schema: StatedSaveTokenSchema, strategy: "input" },
  PublicSlug: { schema: PublicSlugSchema, strategy: "output" },
  HasUnpublishedChanges: {
    schema: HasUnpublishedChangesSchema,
    strategy: "output",
  },
  PostRevisionReason: { schema: PostRevisionReasonSchema, strategy: "output" },
  PostItem: { schema: PostItemSchema, strategy: "output" },
  PostWriteResult: { schema: PostWriteResultSchema, strategy: "output" },
  Tag: { schema: TagSelectSchema, strategy: "output" },
  Category: { schema: CategorySelectSchema, strategy: "output" },
  CategoryOption: { schema: CategoryOptionSchema, strategy: "output" },
  Media: { schema: MediaSelectSchema, strategy: "output" },
  Moment: { schema: PublicMomentSchema, strategy: "output" },
  AdminMoment: { schema: AdminMomentSchema, strategy: "output" },
  MomentImage: { schema: MomentImageSchema, strategy: "output" },
  MomentVideo: { schema: MomentVideoSchema, strategy: "output" },
  RootComment: { schema: RootCommentWithReplyCountSchema, strategy: "output" },
  CommentReply: {
    schema: GetRepliesResponseSchema.shape.items.element,
    strategy: "output",
  },
  UnrepliedComment: {
    schema: UnrepliedCommentsPageSchema.shape.items.element,
    strategy: "output",
  },
  MutedUser: { schema: MutedUserSchema, strategy: "output" },
  FriendLink: { schema: FriendLinkSchema, strategy: "output" },
  AdminConfig: { schema: AdminConfigSnapshotSchema, strategy: "output" },
  PostPopularitySyncStatus: {
    schema: PostPopularitySyncStatusSchema,
    strategy: "output",
  },
  UpdateCheckResult: { schema: UpdateCheckResultSchema, strategy: "output" },
  // The body of an error an operation does not declare.
  UndefinedError: { error: "UndefinedError" },
};
