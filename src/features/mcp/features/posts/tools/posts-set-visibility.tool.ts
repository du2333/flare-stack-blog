import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { toLocalDateString } from "@/lib/utils";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostSetVisibilityInputSchema,
  McpPostSetVisibilityOutputSchema,
} from "../schema/mcp-posts.schema";

const POSTS_SET_VISIBILITY_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const postsSetVisibilityTool = defineMcpTool({
  name: "posts_set_visibility",
  description:
    "Publish or unpublish a post. This queues the publish workflow, not just a raw field update.",
  requiredScopes: POSTS_SET_VISIBILITY_REQUIRED_SCOPES,
  inputSchema: McpPostSetVisibilityInputSchema,
  outputSchema: McpPostSetVisibilityOutputSchema,
  async handler(args, context) {
    const updateResult = await PostService.updatePost(context, {
      id: args.id,
      data: {
        status: args.visibility,
        ...(args.publishedAt !== undefined
          ? {
              publishedAt: args.publishedAt ? new Date(args.publishedAt) : null,
            }
          : {}),
      },
    });

    if (updateResult.error) {
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

    await PostService.startPostProcessWorkflow(context, {
      id: args.id,
      status: args.visibility,
      clientToday: args.clientToday ?? toLocalDateString(new Date()),
    });

    const post = await PostService.findPostById(context, { id: args.id });
    if (!post) {
      return {
        content: [
          {
            type: "text",
            text: `Post ${args.id} visibility was queued but could not be reloaded`,
          },
        ],
        isError: true,
      };
    }

    const operation = args.visibility === "published" ? "publish" : "unpublish";

    const result = {
      id: post.id,
      operation,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      status: post.status,
      workflowQueued: true as const,
    };

    return {
      content: [
        {
          type: "text",
          text:
            operation === "publish"
              ? `Queued publish workflow for post ${post.id}`
              : `Queued unpublish workflow for post ${post.id}`,
        },
      ],
      structuredContent: result,
    };
  },
});
