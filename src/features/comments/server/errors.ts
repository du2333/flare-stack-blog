// Shared by the public and the Admin comment procedures.
export const commentErrors = {
  ROOT_COMMENT_NOT_FOUND: { status: 404, message: "Root comment not found." },
  INVALID_ROOT_ID: { status: 400, message: "Invalid root comment." },
  ROOT_COMMENT_POST_MISMATCH: {
    status: 400,
    message: "Root comment does not belong to this post or moment.",
  },
  REPLY_TO_COMMENT_NOT_FOUND: {
    status: 404,
    message: "Reply target not found.",
  },
  REPLY_TO_COMMENT_ROOT_MISMATCH: {
    status: 400,
    message: "Reply target is not in this thread.",
  },
  ROOT_COMMENT_CANNOT_HAVE_REPLY_TO: {
    status: 400,
    message: "A root comment cannot reply to another comment.",
  },
  COMMENT_NOT_FOUND: { status: 404, message: "Comment not found." },
  POST_NOT_FOUND: { status: 404, message: "Post not found." },
  MOMENT_NOT_FOUND: { status: 404, message: "Moment not found." },
  POST_NOT_PUBLISHED: {
    status: 400,
    message: "Comments require a published post.",
  },
  USER_MUTED: {
    status: 403,
    message: "Muted users cannot create comments.",
  },
  NAME_REQUIRED: {
    status: 403,
    message: "Set a public name before commenting.",
  },
} as const;
