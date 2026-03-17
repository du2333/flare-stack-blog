import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpMediaByKeyInputSchema,
  McpMediaUsageOutputSchema,
} from "../schema/mcp-media.schema";
import { getMcpMediaUsage } from "../service/mcp-media.service";

const MEDIA_GET_USAGE_REQUIRED_SCOPES: OAuthScopeRequest = {
  media: ["read"],
};

export const mediaGetUsageTool = defineMcpTool({
  name: "media_get_usage",
  description: "Show which posts reference one media item.",
  requiredScopes: MEDIA_GET_USAGE_REQUIRED_SCOPES,
  inputSchema: McpMediaByKeyInputSchema,
  outputSchema: McpMediaUsageOutputSchema,
  async handler(args, context) {
    const result = await getMcpMediaUsage(context, args.key);

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
