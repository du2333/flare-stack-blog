import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpMediaListInputSchema,
  McpMediaListOutputSchema,
} from "../schema/mcp-media.schema";
import { listMcpMedia } from "../service/mcp-media.service";

const MEDIA_LIST_REQUIRED_SCOPES: OAuthScopeRequest = {
  media: ["read"],
};

export const mediaListTool = defineMcpTool({
  name: "media_list",
  description: "List media library items.",
  requiredScopes: MEDIA_LIST_REQUIRED_SCOPES,
  inputSchema: McpMediaListInputSchema,
  outputSchema: McpMediaListOutputSchema,
  async handler(args, context) {
    const result = await listMcpMedia(context, args);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
