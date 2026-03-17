import {
  oauthProviderAuthServerMetadata,
  oauthProviderOpenIdConfigMetadata,
} from "@better-auth/oauth-provider";
import type { Context } from "hono";
import { Hono } from "hono";
import { baseMiddleware } from "@/lib/hono/middlewares";
import { getOAuthProtectedResourceMetadata } from "../service/oauth-provider.service";

const app = new Hono<{ Bindings: Env }>();

function createAuthAliasRequest(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

const OAUTH_PROVIDER_CACHE_CONTROL =
  "public, max-age=60, stale-while-revalidate=30";

async function createEtag(body: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(body),
  );

  return `"${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}"`;
}

function isEtagMatch(ifNoneMatch: string | undefined, etag: string) {
  if (!ifNoneMatch) return false;

  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === etag || value === "*");
}

function createCachedHeaders(etag: string) {
  return new Headers({
    "Cache-Control": OAUTH_PROVIDER_CACHE_CONTROL,
    "Content-Type": "application/json; charset=UTF-8",
    ETag: etag,
  });
}

function createCachedResponseHeaders(response: Response, etag: string) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", OAUTH_PROVIDER_CACHE_CONTROL);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  headers.set("ETag", etag);
  headers.delete("Content-Length");
  return headers;
}

async function jsonWithConditionalCache(
  c: Context<{ Bindings: Env }>,
  body: unknown,
  responseInit?: Pick<Response, "headers" | "status" | "statusText">,
) {
  const serializedBody = JSON.stringify(body);
  const etag = await createEtag(serializedBody);
  const headers = responseInit
    ? createCachedResponseHeaders(
        new Response(null, {
          headers: responseInit.headers,
          status: responseInit.status,
          statusText: responseInit.statusText,
        }),
        etag,
      )
    : createCachedHeaders(etag);

  if (isEtagMatch(c.req.header("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  return new Response(serializedBody, {
    status: responseInit?.status ?? 200,
    statusText: responseInit?.statusText,
    headers,
  });
}

async function forwardJsonWithConditionalCache(
  c: Context<{ Bindings: Env }>,
  response: Response,
) {
  const contentType = response.headers.get("content-type") ?? "";
  const isSuccessfulJsonResponse =
    response.status === 200 && contentType.includes("application/json");

  if (!isSuccessfulJsonResponse) {
    return response;
  }

  const responseBody = await response.clone().text();

  if (!responseBody) {
    return response;
  }

  try {
    return jsonWithConditionalCache(c, JSON.parse(responseBody), response);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "oauth provider metadata cache parse failed",
        error: "invalid_json",
        request: {
          method: c.req.method,
          url: c.req.url,
        },
        response: {
          status: response.status,
          contentType,
          body: responseBody,
        },
        cause: error instanceof Error ? error.message : String(error),
      }),
    );
    return response;
  }
}

app.get(
  "/.well-known/oauth-authorization-server",
  baseMiddleware,
  async (c) => {
    const auth = c.get("auth");
    return forwardJsonWithConditionalCache(
      c,
      await oauthProviderAuthServerMetadata(auth)(c.req.raw),
    );
  },
);

app.get(
  "/.well-known/oauth-authorization-server/api/auth",
  baseMiddleware,
  async (c) => {
    const auth = c.get("auth");
    return forwardJsonWithConditionalCache(
      c,
      await oauthProviderAuthServerMetadata(auth)(c.req.raw),
    );
  },
);

app.get("/.well-known/openid-configuration", baseMiddleware, async (c) => {
  const auth = c.get("auth");
  return forwardJsonWithConditionalCache(
    c,
    await oauthProviderOpenIdConfigMetadata(auth)(c.req.raw),
  );
});

app.get(
  "/.well-known/openid-configuration/api/auth",
  baseMiddleware,
  async (c) => {
    const auth = c.get("auth");
    return forwardJsonWithConditionalCache(
      c,
      await oauthProviderOpenIdConfigMetadata(auth)(c.req.raw),
    );
  },
);

app.get("/.well-known/jwks.json", baseMiddleware, async (c) => {
  const auth = c.get("auth");
  return forwardJsonWithConditionalCache(
    c,
    await auth.handler(
      createAuthAliasRequest(c.req.raw, "/api/auth/.well-known/jwks.json"),
    ),
  );
});

app.get("/.well-known/oauth-protected-resource", baseMiddleware, async (c) => {
  const metadata = getOAuthProtectedResourceMetadata(c.env, c.req.url);
  return jsonWithConditionalCache(c, metadata);
});

export default app;
