import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import * as TagService from "@/features/tags/tags.service";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpTagsListInputSchema,
  McpTagsListOutputSchema,
} from "../schema/mcp-tags.schema";
import {
  serializeMcpTag,
  serializeMcpTagWithCount,
} from "../service/mcp-tags.service";

const TAGS_LIST_REQUIRED_SCOPES: OAuthScopeRequest = {
  posts: ["read"],
};

export const tagsListTool = defineMcpTool({
  name: "tags_list",
  description: "List tags used by the blog.",
  requiredScopes: TAGS_LIST_REQUIRED_SCOPES,
  inputSchema: McpTagsListInputSchema,
  outputSchema: McpTagsListOutputSchema,
  async handler(args, context) {
    const tags = await TagService.getTags(context, args);
    const items = tags.map((tag) =>
      "postCount" in tag ? serializeMcpTagWithCount(tag) : serializeMcpTag(tag),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items }, null, 2),
        },
      ],
      structuredContent: { items },
    };
  },
});
