import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import { McpPostCreateDraftOutputSchema } from "../schema/mcp-posts.schema";

const POSTS_CREATE_DRAFT_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const postsCreateDraftTool = defineMcpTool({
  name: "posts_create_draft",
  description: "Create a new empty draft post and return its numeric ID.",
  requiredScopes: POSTS_CREATE_DRAFT_REQUIRED_SCOPES,
  outputSchema: McpPostCreateDraftOutputSchema,
  async handler(context) {
    const draft = await PostService.createEmptyPost(context);

    return {
      content: [
        {
          type: "text",
          text: `Created draft post ${draft.id}`,
        },
      ],
      structuredContent: draft,
    };
  },
});
