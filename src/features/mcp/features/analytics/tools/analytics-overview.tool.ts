import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpAnalyticsOverviewInputSchema,
  McpAnalyticsOverviewOutputSchema,
} from "../schema/mcp-analytics.schema";
import { getAnalyticsOverview } from "../service/mcp-analytics.service";

const ANALYTICS_OVERVIEW_REQUIRED_SCOPES: OAuthScopeRequest = {
  analytics: ["read"],
};

export const analyticsOverviewTool = defineMcpTool({
  name: "analytics_overview",
  description:
    "Get a high-level overview of blog operations and traffic analytics.",
  requiredScopes: ANALYTICS_OVERVIEW_REQUIRED_SCOPES,
  inputSchema: McpAnalyticsOverviewInputSchema,
  outputSchema: McpAnalyticsOverviewOutputSchema,
  async handler(args, context) {
    const overview = await getAnalyticsOverview(context, args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(overview, null, 2),
        },
      ],
      structuredContent: overview,
    };
  },
});
