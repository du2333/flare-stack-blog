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
  summarizeAuthorizationHeader,
} from "../service/oauth-provider.service";

declare module "hono" {
  interface ContextVariableMap {
    oauthPrincipal: OAuthPrincipal;
  }
}

function getAuthorizationLogPayload(authorization?: string | null) {
  return summarizeAuthorizationHeader(authorization);
}

function createOAuthErrorResponse(
  c: Context<{ Bindings: Env }>,
  error: unknown,
  fallbackStatus: 401 | 403 = 401,
) {
  const authorization = c.req.header("authorization");

  if (error instanceof APIError) {
    const message =
      typeof error.body?.message === "string"
        ? error.body.message
        : "Unauthorized";

    console.error(
      JSON.stringify({
        message: "oauth access token verification api error",
        error: {
          body: error.body,
          headers: error.headers,
          message,
          status: error.status,
          statusCode: error.statusCode,
        },
        request: {
          method: c.req.method,
          url: c.req.url,
        },
        authorization: getAuthorizationLogPayload(authorization),
      }),
    );

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
      request: {
        method: c.req.method,
        url: c.req.url,
      },
      authorization: getAuthorizationLogPayload(authorization),
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
    const authorization = c.req.header("authorization");
    const accessToken = extractBearerToken(authorization);

    if (!accessToken) {
      console.error(
        JSON.stringify({
          message: "oauth access token missing bearer token",
          request: {
            method: c.req.method,
            url: c.req.url,
          },
          authorization: getAuthorizationLogPayload(authorization),
        }),
      );

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
        c.get("db"),
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
