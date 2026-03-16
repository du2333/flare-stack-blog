import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Context } from "hono";
import { Hono } from "hono";
import { oauthAccessTokenMiddleware } from "@/features/oauth-provider/api/oauth-provider.middleware";
import { extractBearerToken } from "@/features/oauth-provider/service/oauth-provider.service";
import { getServiceContext } from "@/lib/hono/helper";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { createMcpServer } from "../service/mcp.server";

const app = new Hono<{ Bindings: Env }>();

app.use("*", baseMiddleware);

function createMethodNotAllowedResponse(allow: string) {
  return new Response(null, {
    status: 405,
    headers: {
      Allow: allow,
    },
  });
}

function getMcpAuthInfo(c: Context<{ Bindings: Env }>): AuthInfo {
  const principal = c.get("oauthPrincipal");
  const accessToken = extractBearerToken(c.req.header("authorization")) ?? "";

  return {
    clientId: principal.clientId ?? "unknown-client",
    extra: {
      subject: principal.subject,
    },
    scopes: principal.scopes,
    token: accessToken,
  };
}

function isAllowedMcpOrigin(c: Context<{ Bindings: Env }>) {
  const origin = c.req.header("origin");
  if (!origin) return true;

  const requestOrigin = new URL(c.req.url).origin;
  return origin === requestOrigin;
}

const route = app
  .get("/", () => createMethodNotAllowedResponse("POST"))
  .post("/", oauthAccessTokenMiddleware(), async (c) => {
    try {
      if (!isAllowedMcpOrigin(c)) {
        return c.json(
          {
            code: "INVALID_ORIGIN",
            message: "Invalid Origin header",
          },
          403,
        );
      }

      const server = await createMcpServer({
        ...getServiceContext(c),
        principal: c.get("oauthPrincipal"),
      });

      const { WebStandardStreamableHTTPServerTransport } = await import(
        "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
      );

      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
        sessionIdGenerator: undefined,
      });

      await server.connect(transport);

      return transport.handleRequest(c.req.raw, {
        authInfo: getMcpAuthInfo(c),
      });
    } catch (error) {
      const principal = c.get("oauthPrincipal");
      const authInfo = (() => {
        try {
          return getMcpAuthInfo(c);
        } catch {
          return null;
        }
      })();

      console.error(
        JSON.stringify({
          clientId:
            principal?.clientId ?? authInfo?.clientId ?? "unknown-client",
          error:
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : String(error),
          route: "mcp.post",
          subject:
            principal?.subject ?? authInfo?.extra?.subject ?? "unknown-subject",
        }),
      );

      return c.json(
        {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
        500,
      );
    }
  });

export default route;
