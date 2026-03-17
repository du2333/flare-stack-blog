import type { McpToolDefinition } from "../../service/mcp-tool";
import { mediaDeleteTool } from "./tools/media-delete.tool";
import { mediaGetUsageTool } from "./tools/media-get-usage.tool";
import { mediaListTool } from "./tools/media-list.tool";

export const mcpMediaTools: McpToolDefinition[] = [
  mediaListTool,
  mediaGetUsageTool,
  mediaDeleteTool,
];
