import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpCommentsListInputSchema,
  McpCommentsListOutputSchema,
} from "../schema/mcp-comments.schema";
import { listMcpComments } from "../service/mcp-comments.service";

const COMMENTS_LIST_REQUIRED_SCOPES: OAuthScopeRequest = {
  comments: ["read"],
};

export const commentsListTool = defineMcpTool({
  name: "comments_list",
  description:
    "List comments with moderation context such as post metadata and reply previews.",
  requiredScopes: COMMENTS_LIST_REQUIRED_SCOPES,
  inputSchema: McpCommentsListInputSchema,
  outputSchema: McpCommentsListOutputSchema,
  async handler(args, context) {
    const result = await listMcpComments(context, args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    };
  },
});
