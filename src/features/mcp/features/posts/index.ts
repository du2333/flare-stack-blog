import type { McpToolDefinition } from "../../service/mcp-tool";
import { postsCreateDraftTool } from "./tools/posts-create-draft.tool";
import { postsDeleteTool } from "./tools/posts-delete.tool";
import { postsGetTool } from "./tools/posts-get.tool";
import { postsListTool } from "./tools/posts-list.tool";
import { postsSetVisibilityTool } from "./tools/posts-set-visibility.tool";
import { postsUpdateTool } from "./tools/posts-update.tool";

export const mcpPostsTools: McpToolDefinition[] = [
  postsListTool,
  postsGetTool,
  postsCreateDraftTool,
  postsDeleteTool,
  postsUpdateTool,
  postsSetVisibilityTool,
];
