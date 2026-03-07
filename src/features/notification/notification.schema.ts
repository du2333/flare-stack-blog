import { z } from "zod";

const adminCommentCreatedNotificationSchema = z.object({
  type: z.literal("comment.created"),
  data: z.object({
    to: z.string(),
    postTitle: z.string(),
    commenterName: z.string(),
    commentPreview: z.string(),
    commentUrl: z.string(),
  }),
});

const adminCommentPendingReviewNotificationSchema = z.object({
  type: z.literal("comment.pending_review"),
  data: z.object({
    to: z.string(),
    postTitle: z.string(),
    commenterName: z.string(),
    commentPreview: z.string(),
    reviewUrl: z.string(),
  }),
});

const commentReplyPublishedNotificationSchema = z.object({
  type: z.literal("comment.reply_published"),
  data: z.object({
    to: z.string(),
    postTitle: z.string(),
    replierName: z.string(),
    replyPreview: z.string(),
    commentUrl: z.string(),
    unsubscribeUrl: z.string(),
  }),
});

const friendLinkSubmittedNotificationSchema = z.object({
  type: z.literal("friend_link.submitted"),
  data: z.object({
    to: z.string(),
    siteName: z.string(),
    siteUrl: z.string(),
    description: z.string(),
    submitterName: z.string(),
    reviewUrl: z.string(),
  }),
});

const friendLinkApprovedNotificationSchema = z.object({
  type: z.literal("friend_link.approved"),
  data: z.object({
    to: z.string(),
    siteName: z.string(),
    blogUrl: z.string(),
  }),
});

const friendLinkRejectedNotificationSchema = z.object({
  type: z.literal("friend_link.rejected"),
  data: z.object({
    to: z.string(),
    siteName: z.string(),
    rejectionReason: z.string().optional(),
  }),
});

export const notificationEventSchema = z.discriminatedUnion("type", [
  adminCommentCreatedNotificationSchema,
  adminCommentPendingReviewNotificationSchema,
  commentReplyPublishedNotificationSchema,
  friendLinkSubmittedNotificationSchema,
  friendLinkApprovedNotificationSchema,
  friendLinkRejectedNotificationSchema,
]);

export type NotificationEvent = z.infer<typeof notificationEventSchema>;
