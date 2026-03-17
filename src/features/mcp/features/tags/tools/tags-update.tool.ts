import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as TagService from "@/features/tags/tags.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpTagSchema,
  McpTagUpdateInputSchema,
} from "../schema/mcp-tags.schema";
import { serializeMcpTag } from "../service/mcp-tags.service";

const TAGS_UPDATE_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const tagsUpdateTool = defineMcpTool({
  name: "tags_update",
  description: "Rename an existing tag.",
  requiredScopes: TAGS_UPDATE_REQUIRED_SCOPES,
  inputSchema: McpTagUpdateInputSchema,
  outputSchema: McpTagSchema,
  async handler(args, context) {
    const result = await TagService.updateTag(context, {
      id: args.id,
      data: { name: args.name },
    });

    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text:
              result.error.reason === "TAG_NOT_FOUND"
                ? `Tag ${args.id} not found`
                : result.error.reason === "TAG_NAME_ALREADY_EXISTS"
                  ? `Tag "${args.name}" already exists`
                  : `Failed to update tag ${args.id}`,
          },
        ],
        isError: true,
      };
    }

    const tag = serializeMcpTag(result.data);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tag, null, 2),
        },
      ],
      structuredContent: tag,
    };
  },
});
