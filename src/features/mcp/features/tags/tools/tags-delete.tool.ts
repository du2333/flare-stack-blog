import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as TagService from "@/features/tags/tags.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpTagDeleteInputSchema,
  McpTagDeleteOutputSchema,
} from "../schema/mcp-tags.schema";

const TAGS_DELETE_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const tagsDeleteTool = defineMcpTool({
  name: "tags_delete",
  description: "Delete a tag.",
  requiredScopes: TAGS_DELETE_REQUIRED_SCOPES,
  inputSchema: McpTagDeleteInputSchema,
  outputSchema: McpTagDeleteOutputSchema,
  async handler(args, context) {
    const result = await TagService.deleteTag(context, { id: args.id });

    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text:
              result.error.reason === "TAG_NOT_FOUND"
                ? `Tag ${args.id} not found`
                : `Failed to delete tag ${args.id}`,
          },
        ],
        isError: true,
      };
    }

    const output = {
      deleted: true as const,
      id: args.id,
    };

    return {
      content: [
        {
          type: "text",
          text: `Deleted tag ${args.id}`,
        },
      ],
      structuredContent: output,
    };
  },
});
