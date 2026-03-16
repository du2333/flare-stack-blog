import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as TagService from "@/features/tags/tags.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpTagCreateInputSchema,
  McpTagSchema,
} from "../schema/mcp-tags.schema";
import { serializeMcpTag } from "../service/mcp-tags.service";

const TAGS_CREATE_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["write"],
};

export const tagsCreateTool = defineMcpTool({
  name: "tags_create",
  description: "Create a new tag.",
  requiredScopes: TAGS_CREATE_REQUIRED_SCOPES,
  inputSchema: McpTagCreateInputSchema,
  outputSchema: McpTagSchema,
  async handler(args, context) {
    const result = await TagService.createTag(context, { name: args.name });

    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text:
              result.error.reason === "TAG_NAME_ALREADY_EXISTS"
                ? `Tag "${args.name}" already exists`
                : `Failed to create tag "${args.name}"`,
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
