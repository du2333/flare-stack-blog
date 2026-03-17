import * as FriendLinkService from "@/features/friend-links/friend-links.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpFriendLinksListInputSchema,
  McpFriendLinksListOutputSchema,
} from "../schema/mcp-friend-links.schema";
import { serializeMcpFriendLink } from "../service/mcp-friend-links.service";

const FRIEND_LINKS_LIST_REQUIRED_SCOPES: OAuthScopeRequest = {
  "friend-links": ["read"],
};

export const friendLinksListTool = defineMcpTool({
  name: "friend_links_list",
  description: "List friend links with moderation status.",
  requiredScopes: FRIEND_LINKS_LIST_REQUIRED_SCOPES,
  inputSchema: McpFriendLinksListInputSchema,
  outputSchema: McpFriendLinksListOutputSchema,
  async handler(args, context) {
    const result = await FriendLinkService.getAllFriendLinks(context, args);
    const items = result.items.map(serializeMcpFriendLink);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ items, total: result.total }, null, 2),
        },
      ],
      structuredContent: {
        items,
        total: result.total,
      },
    };
  },
});
