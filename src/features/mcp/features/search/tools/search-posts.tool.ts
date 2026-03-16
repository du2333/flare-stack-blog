import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpSearchPostsInputSchema,
  McpSearchPostsOutputSchema,
} from "../schema/mcp-search.schema";
import { searchPosts } from "../service/mcp-search.service";

const SEARCH_POSTS_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["read"],
};

export const searchPostsTool = defineMcpTool({
  name: "search_posts",
  description:
    "Search published blog posts using the full-text search index and return ranked matches.",
  requiredScopes: SEARCH_POSTS_REQUIRED_SCOPES,
  inputSchema: McpSearchPostsInputSchema,
  outputSchema: McpSearchPostsOutputSchema,
  async handler(args, context) {
    const items = await searchPosts(context, args);

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
