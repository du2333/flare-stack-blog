import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OAuthPrincipal } from "@/features/oauth-provider/schema/oauth-provider.schema";

export interface McpToolContext {
  db: DB;
  env: Env;
  executionCtx: ExecutionContext;
  principal: OAuthPrincipal;
}

export type McpToolRegistrar = (
  server: McpServer,
  context: McpToolContext,
) => void;
