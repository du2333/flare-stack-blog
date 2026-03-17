import { APIError } from "better-call";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { OAuthScope } from "../oauth-provider.config";
import type {
  OAuthPrincipal,
  OAuthScopeRequest,
} from "../schema/oauth-provider.schema";
import { verifyOAuthAccessToken } from "../service/oauth-provider.server-client";
import {
  createOAuthPrincipal,
  extractBearerToken,
  getOAuthProtectedResourceMetadataUrl,
} from "../service/oauth-provider.service";

declare module "hono" {
  interface ContextVariableMap {
    oauthPrincipal: OAuthPrincipal;
  }
}

function createOAuthErrorResponse(
  c: Context<{ Bindings: Env }>,
  error: unknown,
  fallbackStatus: 401 | 403 = 401,
) {
  if (error instanceof APIError) {
    const message =
      typeof error.body?.message === "string"
        ? error.body.message
        : "Unauthorized";

    return new Response(
      JSON.stringify({
        code: error.status,
        message,
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...error.headers,
        },
        status: error.statusCode,
      },
    );
  }

  console.error(
    JSON.stringify({
      message: "oauth access token verification failed",
      error: error instanceof Error ? error.message : String(error),
    }),
  );

  return c.json(
    {
      code: fallbackStatus === 403 ? "FORBIDDEN" : "UNAUTHORIZED",
      message: fallbackStatus === 403 ? "Forbidden" : "Unauthorized",
    },
    fallbackStatus,
  );
}

export const oauthAccessTokenMiddleware = (
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const accessToken = extractBearerToken(c.req.header("authorization"));

    if (!accessToken) {
      c.header(
        "WWW-Authenticate",
        `Bearer resource_metadata="${getOAuthProtectedResourceMetadataUrl(c.req.url)}"`,
      );
      return c.json(
        {
          code: "UNAUTHORIZED",
          message: "Missing bearer token",
        },
        401,
      );
    }

    try {
      const jwt = await verifyOAuthAccessToken(
        c.env,
        c.req.url,
        accessToken,
        requiredScopes,
      );

      c.set("oauthPrincipal", createOAuthPrincipal(jwt));
      return next();
    } catch (error) {
      return createOAuthErrorResponse(c, error);
    }
  });
