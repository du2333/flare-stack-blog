import * as FriendLinkService from "@/features/friend-links/friend-links.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpFriendLinkByIdInputSchema,
  McpFriendLinkDeleteOutputSchema,
} from "../schema/mcp-friend-links.schema";

const FRIEND_LINKS_DELETE_REQUIRED_SCOPES: OAuthScopeRequest = {
  "friend-links": ["write"],
};

export const friendLinksDeleteTool = defineMcpTool({
  name: "friend_links_delete",
  description: "Delete a friend link.",
  requiredScopes: FRIEND_LINKS_DELETE_REQUIRED_SCOPES,
  inputSchema: McpFriendLinkByIdInputSchema,
  outputSchema: McpFriendLinkDeleteOutputSchema,
  async handler(args, context) {
    const result = await FriendLinkService.deleteFriendLink(context, args);
    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text: `Friend link ${args.id} not found`,
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
      content: [{ type: "text", text: `Deleted friend link ${args.id}` }],
      structuredContent: output,
    };
  },
});
