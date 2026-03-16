import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import * as TagService from "@/features/tags/tags.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpPostSetTagsInputSchema,
  McpPostSetTagsOutputSchema,
} from "../schema/mcp-tags.schema";
import {
  ensureTagIdsByNames,
  serializeMcpTag,
} from "../service/mcp-tags.service";

const POSTS_SET_TAGS_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const postsSetTagsTool = defineMcpTool({
  name: "posts_set_tags",
  description:
    "Replace all tags on a post. Missing tags are created automatically.",
  requiredScopes: POSTS_SET_TAGS_REQUIRED_SCOPES,
  inputSchema: McpPostSetTagsInputSchema,
  outputSchema: McpPostSetTagsOutputSchema,
  async handler(args, context) {
    const post = await PostService.findPostById(context, { id: args.postId });
    if (!post) {
      return {
        content: [
          {
            type: "text",
            text: `Post ${args.postId} not found`,
          },
        ],
        isError: true,
      };
    }

    const tagIds = await ensureTagIdsByNames(context, args.tagNames);
    await TagService.setPostTags(context, {
      postId: args.postId,
      tagIds,
    });

    const tags = await TagService.getTagsByPostId(context, {
      postId: args.postId,
    });
    const output = {
      postId: args.postId,
      tags: tags.map(serializeMcpTag),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(output, null, 2),
        },
      ],
      structuredContent: output,
    };
  },
});
