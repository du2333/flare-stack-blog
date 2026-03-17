import * as FriendLinkService from "@/features/friend-links/friend-links.service";
import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { defineMcpTool } from "../../../service/mcp-tool";
import {
  McpFriendLinkSchema,
  McpFriendLinkUpdateInputSchema,
} from "../schema/mcp-friend-links.schema";
import { serializeMcpFriendLink } from "../service/mcp-friend-links.service";

const FRIEND_LINKS_UPDATE_REQUIRED_SCOPES: OAuthScopeRequest = {
  "friend-links": ["write"],
};

export const friendLinksUpdateTool = defineMcpTool({
  name: "friend_links_update",
  description:
    "Update friend link fields or change moderation status to approved or rejected.",
  requiredScopes: FRIEND_LINKS_UPDATE_REQUIRED_SCOPES,
  inputSchema: McpFriendLinkUpdateInputSchema,
  outputSchema: McpFriendLinkSchema,
  async handler(args, context) {
    const { id, status, rejectionReason, ...updateData } = args;
    const hasFieldUpdates = Object.values(updateData).some(
      (value) => value !== undefined,
    );

    let result:
      | Awaited<ReturnType<typeof FriendLinkService.updateFriendLink>>
      | Awaited<ReturnType<typeof FriendLinkService.approveFriendLink>>
      | Awaited<ReturnType<typeof FriendLinkService.rejectFriendLink>>;

    if (status === "approved") {
      result = await FriendLinkService.approveFriendLink(context, { id });
    } else if (status === "rejected") {
      result = await FriendLinkService.rejectFriendLink(context, {
        id,
        rejectionReason,
      });
    } else {
      result = await FriendLinkService.updateFriendLink(context, {
        id,
        ...updateData,
      });
    }

    if (result.error) {
      return {
        content: [
          {
            type: "text",
            text:
              result.error.reason === "NOT_FOUND"
                ? `Friend link ${id} not found`
                : `Failed to update friend link ${id}`,
          },
        ],
        isError: true,
      };
    }

    const output = serializeMcpFriendLink({ ...result.data, user: null });

    return {
      content: [
        {
          type: "text",
          text:
            status === "approved"
              ? `Approved friend link ${id}`
              : status === "rejected"
                ? `Rejected friend link ${id}`
                : hasFieldUpdates
                  ? JSON.stringify(output, null, 2)
                  : `Updated friend link ${id}`,
        },
      ],
      structuredContent: output,
    };
  },
});
