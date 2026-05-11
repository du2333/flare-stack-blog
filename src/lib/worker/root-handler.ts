import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { McpApiHandler } from "@/features/mcp/api/mcp-api-handler";
import {
  createInvalidMcpApiKeyResponse,
  createMcpApiKeyAuthProps,
  getMcpApiKeyAuthStatus,
} from "@/features/mcp/api/mcp-api-key-auth";
import { MCP_API_ROUTE } from "@/features/mcp/constants";
import { createWorkersOAuthProviderOptions } from "@/features/oauth-provider/oauth-provider.config";
import { appWorkerHandler } from "./app-handler";

let oauthProvider: OAuthProvider<Env> | null = null;

function getOAuthProvider() {
  if (oauthProvider) {
    return oauthProvider;
  }

  oauthProvider = new OAuthProvider(
    createWorkersOAuthProviderOptions({
      apiHandlers: {
        "/mcp": McpApiHandler,
      },
      defaultHandler: appWorkerHandler,
    }),
  );

  return oauthProvider;
}

function isMcpApiRequest(request: Request) {
  return new URL(request.url).pathname.startsWith(MCP_API_ROUTE);
}

function handleMcpApiRequestDirectly(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  props?: Record<string, unknown>,
) {
  const executionCtx = ctx as ExecutionContext & {
    props?: Record<string, unknown>;
  };

  if (props) {
    executionCtx.props = props;
  }

  return new McpApiHandler(executionCtx, env).fetch(request);
}

export function handleRootRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) {
  if (isMcpApiRequest(request)) {
    if (request.method === "OPTIONS") {
      return handleMcpApiRequestDirectly(request, env, ctx);
    }

    const apiKeyAuthStatus = getMcpApiKeyAuthStatus(request, env);

    if (apiKeyAuthStatus === "valid") {
      return handleMcpApiRequestDirectly(
        request,
        env,
        ctx,
        createMcpApiKeyAuthProps(),
      );
    }

    if (apiKeyAuthStatus === "invalid") {
      return createInvalidMcpApiKeyResponse();
    }
  }

  return getOAuthProvider().fetch(request, env, ctx);
}
