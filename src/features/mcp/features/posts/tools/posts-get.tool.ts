import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostByIdInputSchema,
  McpPostDetailSchema,
} from "../schema/mcp-posts.schema";
import { serializeMcpPostDetail } from "../service/mcp-posts.service";

const POSTS_GET_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["read"],
};

export const postsGetTool = defineMcpTool({
  name: "posts_get",
  description:
    "Get a single blog post by numeric ID, including markdown body, tags, and sync metadata.",
  requiredScopes: POSTS_GET_REQUIRED_SCOPES,
  inputSchema: McpPostByIdInputSchema,
  outputSchema: McpPostDetailSchema,
  async handler(args, context) {
    const post = await PostService.findPostById(context, args);

    if (!post) {
      return {
        content: [
          {
            type: "text",
            text: `Post ${args.id} not found`,
          },
        ],
        isError: true,
      };
    }

    const serializedPost = serializeMcpPostDetail(post);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(serializedPost, null, 2),
        },
      ],
      structuredContent: serializedPost,
    };
  },
});
