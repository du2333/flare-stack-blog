import { WorkerEntrypoint } from "cloudflare:workers";
import { createMcpHandler } from "agents/mcp";
import { createOAuthPrincipalFromProps } from "@/features/oauth-provider/service/oauth-provider.service";
import { getDb } from "@/lib/db";
import { MCP_API_ROUTE } from "../constants";
import { createMcpServer } from "../service/mcp.server";
import {
  applyMcpOriginPolicy,
  createInvalidOriginResponse,
  createMcpPreflightResponse,
  isAllowedMcpOrigin,
} from "../utils/mcp-origin";

type OAuthProps = Record<string, unknown>;

function getOAuthProps(ctx: ExecutionContext): OAuthProps {
  const maybeContext = ctx as ExecutionContext & { props?: OAuthProps };
  return maybeContext.props ?? {};
}

export class McpApiHandler extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    if (!isAllowedMcpOrigin(request)) {
      return createInvalidOriginResponse();
    }

    if (request.method === "OPTIONS") {
      return applyMcpOriginPolicy(request, createMcpPreflightResponse());
    }

    const executionCtx = this.ctx as ExecutionContext;
    const authProps = getOAuthProps(executionCtx);
    const db = getDb(this.env);
    const server = await createMcpServer({
      db,
      env: this.env,
      executionCtx,
      principal: createOAuthPrincipalFromProps(authProps),
    });

    const response = await createMcpHandler(
      server as unknown as Parameters<typeof createMcpHandler>[0],
      {
        authContext: {
          props: authProps,
        },
        route: MCP_API_ROUTE,
      },
    )(request, this.env, executionCtx);

    return applyMcpOriginPolicy(request, response);
  }
}
