import * as FriendLinkService from "@/features/friend-links/friend-links.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpFriendLinkCreateInputSchema,
  McpFriendLinkSchema,
} from "../schema/mcp-friend-links.schema";
import { serializeMcpFriendLink } from "../service/mcp-friend-links.service";

const FRIEND_LINKS_CREATE_REQUIRED_SCOPES: OAuthScopeRequest = {
  "friend-links": ["write"],
};

export const friendLinksCreateTool = defineMcpTool({
  name: "friend_links_create",
  description: "Create an approved friend link entry.",
  requiredScopes: FRIEND_LINKS_CREATE_REQUIRED_SCOPES,
  inputSchema: McpFriendLinkCreateInputSchema,
  outputSchema: McpFriendLinkSchema,
  async handler(args, context) {
    const result = await FriendLinkService.createFriendLink(context, args);
    const output = serializeMcpFriendLink({ ...result, user: null });

    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  },
});
