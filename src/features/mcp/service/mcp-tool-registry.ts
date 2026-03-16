import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mcpPostsTools } from "../features/posts";
import { mcpSearchTools } from "../features/search";
import type { McpToolContext } from "./mcp.types";
import type { McpToolDefinition } from "./mcp-tool";
import { registerMcpTool } from "./mcp-tool";

const MCP_TOOLS: McpToolDefinition[] = [...mcpPostsTools, ...mcpSearchTools];

export function registerMcpTools(server: McpServer, context: McpToolContext) {
  MCP_TOOLS.forEach((tool) => {
    registerMcpTool(server, context, tool);
  });
}
