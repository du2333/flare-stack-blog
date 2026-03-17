import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mcpCommentsTools } from "../features/comments";
import { mcpPostsTools } from "../features/posts";
import { mcpSearchTools } from "../features/search";
import { mcpTagsTools } from "../features/tags";
import type { McpToolContext } from "./mcp.types";
import type { McpToolDefinition } from "./mcp-tool";
import { registerMcpTool } from "./mcp-tool";

const MCP_TOOLS: McpToolDefinition[] = [
  ...mcpCommentsTools,
  ...mcpPostsTools,
  ...mcpSearchTools,
  ...mcpTagsTools,
];

export function registerMcpTools(server: McpServer, context: McpToolContext) {
  MCP_TOOLS.forEach((tool) => {
    registerMcpTool(server, context, tool);
  });
}
