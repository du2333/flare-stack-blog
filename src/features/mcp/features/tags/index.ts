import type { McpToolDefinition } from "../../service/mcp-tool";
import { postsSetTagsTool } from "./tools/posts-set-tags.tool";
import { tagsCreateTool } from "./tools/tags-create.tool";
import { tagsDeleteTool } from "./tools/tags-delete.tool";
import { tagsListTool } from "./tools/tags-list.tool";
import { tagsUpdateTool } from "./tools/tags-update.tool";

export const mcpTagsTools: McpToolDefinition[] = [
  tagsListTool,
  tagsCreateTool,
  tagsUpdateTool,
  tagsDeleteTool,
  postsSetTagsTool,
];
