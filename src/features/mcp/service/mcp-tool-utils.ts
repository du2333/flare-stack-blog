import type { OAuthScopeRequest } from "@/features/oauth-provider/schema/oauth-provider.schema";
import { getMissingScopes } from "@/features/oauth-provider/service/oauth-provider.service";
import type { McpToolContext } from "./mcp.types";

export function createTextToolResult(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

export function createScopeErrorResult(
  context: McpToolContext,
  requiredScopes: OAuthScopeRequest,
) {
  const missingScopes = getMissingScopes(
    context.principal.scopes,
    requiredScopes,
  );

  return {
    content: [
      {
        type: "text" as const,
        text: `Missing required scopes: ${missingScopes.join(", ")}`,
      },
    ],
    isError: true as const,
  };
}

export function canAccessTool(
  context: McpToolContext,
  requiredScopes: OAuthScopeRequest,
) {
  return (
    getMissingScopes(context.principal.scopes, requiredScopes).length === 0
  );
}
