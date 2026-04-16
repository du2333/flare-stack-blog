import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostsListInputSchema,
  McpPostsListOutputSchema,
} from "../schema/mcp-posts.schema";
import { serializeMcpPostListItem } from "../service/mcp-posts.service";

const POSTS_LIST_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["read"],
};

export const postsListTool = defineMcpTool({
  name: "posts_list",
  description:
    "List blog posts with optional filters for admin-style management.",
  requiredScopes: POSTS_LIST_REQUIRED_SCOPES,
  inputSchema: McpPostsListInputSchema,
  outputSchema: McpPostsListOutputSchema,
  async handler(args, context) {
    const items = (await PostService.getPosts(context, args)).map(
      serializeMcpPostListItem,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items }, null, 2),
        },
      ],
      structuredContent: {
        items,
      },
    };
  },
});
