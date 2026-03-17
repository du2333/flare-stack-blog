import type { McpToolDefinition } from "../../service/mcp-tool";
import { friendLinksCreateTool } from "./tools/friend-links-create.tool";
import { friendLinksDeleteTool } from "./tools/friend-links-delete.tool";
import { friendLinksListTool } from "./tools/friend-links-list.tool";
import { friendLinksUpdateTool } from "./tools/friend-links-update.tool";

export const mcpFriendLinksTools: McpToolDefinition[] = [
  friendLinksListTool,
  friendLinksCreateTool,
  friendLinksUpdateTool,
  friendLinksDeleteTool,
];
