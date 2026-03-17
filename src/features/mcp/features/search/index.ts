import type { McpToolDefinition } from "../../service/mcp-tool";
import { searchPostsTool } from "./tools/search-posts.tool";

export const mcpSearchTools: McpToolDefinition[] = [searchPostsTool];
