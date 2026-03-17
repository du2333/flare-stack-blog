import * as CommentService from "@/features/comments/comments.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpCommentStatusUpdateInputSchema,
  McpCommentStatusUpdateOutputSchema,
} from "../schema/mcp-comments.schema";

const COMMENTS_SET_STATUS_REQUIRED_SCOPES: OAuthScopeRequest = {
  comments: ["write"],
};

export const commentsSetStatusTool = defineMcpTool({
  name: "comments_set_status",
  description: "Update a comment moderation status.",
  requiredScopes: COMMENTS_SET_STATUS_REQUIRED_SCOPES,
  inputSchema: McpCommentStatusUpdateInputSchema,
  outputSchema: McpCommentStatusUpdateOutputSchema,
  async handler(args, context) {
    const comment = await CommentService.findCommentById(context, args.id);
    if (!comment) {
      return {
        content: [{ type: "text", text: `Comment ${args.id} not found` }],
        isError: true,
      };
    }

    const result = await CommentService.moderateComment(context, args);
    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text: `Comment ${args.id} could not be updated`,
          },
        ],
        isError: true,
      };
    }

    const payload = {
      id: result.data.id,
      previousStatus: comment.status,
      status: result.data.status,
      postId: result.data.postId,
    };

    return {
      content: [
        {
          type: "text",
          text: `Updated comment ${args.id} status to ${result.data.status}`,
        },
      ],
      structuredContent: payload,
    };
  },
});
