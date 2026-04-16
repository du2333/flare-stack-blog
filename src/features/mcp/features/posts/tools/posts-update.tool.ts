import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostDetailSchema,
  McpPostUpdateInputSchema,
} from "../schema/mcp-posts.schema";
import {
  serializeMcpPostDetail,
  toPostUpdateInput,
} from "../service/mcp-posts.service";

const POSTS_UPDATE_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const postsUpdateTool = defineMcpTool({
  name: "posts_update",
  description:
    "Update a blog post. Use markdown for the body. Typical flow is create a draft first, then update it.",
  requiredScopes: POSTS_UPDATE_REQUIRED_SCOPES,
  inputSchema: McpPostUpdateInputSchema,
  outputSchema: McpPostDetailSchema,
  async handler(args, context) {
    const updateInput = await toPostUpdateInput(args);
    const result = await PostService.updatePost(context, updateInput);

    if (result.error) {
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

    const post = await PostService.findPostById(context, {
      id: result.data.id,
    });
    if (!post) {
      return {
        content: [
          {
            type: "text",
            text: `Post ${args.id} was updated but could not be reloaded`,
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
