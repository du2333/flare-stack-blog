import type { McpToolDefinition } from "../../service/mcp-tool";
import { commentsDeleteTool } from "./tools/comments-delete.tool";
import { commentsListTool } from "./tools/comments-list.tool";
import { commentsSetStatusTool } from "./tools/comments-set-status.tool";

export const mcpCommentsTools: McpToolDefinition[] = [
  commentsListTool,
  commentsSetStatusTool,
  commentsDeleteTool,
];
