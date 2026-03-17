import * as CommentService from "@/features/comments/comments.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpCommentByIdInputSchema,
  McpCommentDeleteOutputSchema,
} from "../schema/mcp-comments.schema";

const COMMENTS_DELETE_REQUIRED_SCOPES: OAuthScopeRequest = {
  comments: ["write"],
};

export const commentsDeleteTool = defineMcpTool({
  name: "comments_delete",
  description: "Delete a comment permanently.",
  requiredScopes: COMMENTS_DELETE_REQUIRED_SCOPES,
  inputSchema: McpCommentByIdInputSchema,
  outputSchema: McpCommentDeleteOutputSchema,
  async handler(args, context) {
    const comment = await CommentService.findCommentById(context, args.id);
    if (!comment) {
      return {
        content: [{ type: "text", text: `Comment ${args.id} not found` }],
        isError: true,
      };
    }

    const deleteResult = await CommentService.adminDeleteComment(context, args);
    if (deleteResult.error) {
      return {
        content: [
          {
            type: "text",
            text: `Comment ${args.id} could not be deleted`,
          },
        ],
        isError: true,
      };
    }

    const payload = {
      deleted: true as const,
      id: comment.id,
      previousStatus: comment.status,
      postId: comment.postId,
    };

    return {
      content: [
        {
          type: "text",
          text: `Deleted comment ${args.id}`,
        },
      ],
      structuredContent: payload,
    };
  },
});
