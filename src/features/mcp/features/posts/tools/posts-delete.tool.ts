import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostByIdInputSchema,
  McpPostDeleteOutputSchema,
} from "../schema/mcp-posts.schema";

const POSTS_DELETE_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const postsDeleteTool = defineMcpTool({
  name: "posts_delete",
  description:
    "Delete a post permanently. Use with care because this removes the post from the CMS.",
  requiredScopes: POSTS_DELETE_REQUIRED_SCOPES,
  inputSchema: McpPostByIdInputSchema,
  outputSchema: McpPostDeleteOutputSchema,
  async handler(args, context) {
    const post = await PostService.findPostById(context, { id: args.id });
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

    const deleteResult = await PostService.deletePost(context, { id: args.id });
    if (deleteResult.error) {
      return {
        content: [
          {
            type: "text",
            text: `Post ${args.id} could not be deleted`,
          },
        ],
        isError: true,
      };
    }

    const result = {
      deleted: true as const,
      id: post.id,
      slug: post.slug,
      status: post.status,
      title: post.title,
    };

    return {
      content: [
        {
          type: "text",
          text: `Deleted post ${post.id} (${post.slug})`,
        },
      ],
      structuredContent: result,
    };
  },
});
