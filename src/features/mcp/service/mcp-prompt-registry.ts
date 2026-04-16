import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  moderatePendingCommentsPrompt,
  publishPostWorkflowPrompt,
  reviewBlogAnalyticsPrompt,
  writePostFromBriefPrompt,
} from "../prompts";
import type { McpToolContext } from "./mcp.types";
import { registerMcpPrompt } from "./mcp-prompt";

export function registerMcpPrompts(server: McpServer, context: McpToolContext) {
  registerMcpPrompt(server, context, writePostFromBriefPrompt);
  registerMcpPrompt(server, context, publishPostWorkflowPrompt);
  registerMcpPrompt(server, context, moderatePendingCommentsPrompt);
  registerMcpPrompt(server, context, reviewBlogAnalyticsPrompt);
}
