import type { ResourceServerMetadata } from "@better-auth/oauth-provider";
import type { JWTPayload } from "jose";
import { serverEnv } from "@/lib/env/server.env";
import type { OAuthScope } from "../oauth-provider.config";
import {
  getOAuthJwksUrl as getConfiguredOAuthJwksUrl,
  getOAuthAuthorizationServerUrl,
  getOAuthProtectedResourceUrl,
  OAUTH_BLOG_SCOPES,
  OAUTH_PROVIDER_SCOPES,
} from "../oauth-provider.config";
import type {
  OAuthPrincipal,
  OAuthScopeRequest,
} from "../schema/oauth-provider.schema";
import { flattenBlogScopes } from "./oauth-provider.scope";

const OAUTH_SCOPE_SET = new Set<string>(OAUTH_PROVIDER_SCOPES);

export function normalizeRequiredScopes(
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
): OAuthScope[] {
  return Array.isArray(requiredScopes)
    ? requiredScopes
    : flattenBlogScopes(requiredScopes);
}

export function getMissingScopes(
  grantedScopes: OAuthScope[],
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
): OAuthScope[] {
  const normalizedRequiredScopes = normalizeRequiredScopes(requiredScopes);
  return normalizedRequiredScopes.filter(
    (scope) => !grantedScopes.includes(scope),
  );
}

export function hasRequiredScopes(
  grantedScopes: OAuthScope[],
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) {
  return getMissingScopes(grantedScopes, requiredScopes).length === 0;
}

export function getOAuthProtectedResource(requestUrl: string) {
  return new URL("/", requestUrl).toString();
}

export function getOAuthProtectedResourceMetadataUrl(requestUrl: string) {
  return new URL(
    "/.well-known/oauth-protected-resource",
    requestUrl,
  ).toString();
}

export function getOAuthAuthorizationServer(env: Env) {
  return getOAuthAuthorizationServerUrl(serverEnv(env).BETTER_AUTH_URL);
}

export function getOAuthJwksUrl(env: Env) {
  return getConfiguredOAuthJwksUrl(serverEnv(env).BETTER_AUTH_URL);
}

export function extractBearerToken(authorization?: string | null) {
  if (!authorization) return null;

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || null;
  }

  return authorization.trim() || null;
}

export function summarizeAuthorizationHeader(authorization?: string | null) {
  if (!authorization) {
    return {
      present: false,
      scheme: null,
      rawLength: 0,
      tokenLength: 0,
      tokenSegmentCount: 0,
      looksLikeJwt: false,
    };
  }

  const trimmedAuthorization = authorization.trim();
  const [scheme = null, ...rest] = trimmedAuthorization.split(/\s+/);
  const token = rest.join(" ").trim();
  const tokenSegmentCount = token ? token.split(".").length : 0;

  return {
    present: true,
    scheme,
    rawLength: trimmedAuthorization.length,
    tokenLength: token.length,
    tokenSegmentCount,
    looksLikeJwt: tokenSegmentCount === 3,
  };
}

export function parseOAuthScopes(scopeClaim: unknown): OAuthScope[] {
  if (typeof scopeClaim !== "string" || !scopeClaim.length) {
    return [];
  }

  return scopeClaim
    .split(" ")
    .map((scope) => scope.trim())
    .filter(
      (scope): scope is OAuthScope =>
        scope.length > 0 && OAUTH_SCOPE_SET.has(scope),
    );
}

export function createOAuthPrincipal(jwt: JWTPayload): OAuthPrincipal {
  return {
    clientId: typeof jwt.azp === "string" ? jwt.azp : null,
    scopes: parseOAuthScopes(jwt.scope),
    subject: typeof jwt.sub === "string" ? jwt.sub : null,
    token: jwt,
  };
}

export function getOAuthProtectedResourceMetadata(
  env: Env,
  _requestUrl: string,
): ResourceServerMetadata {
  const baseURL = serverEnv(env).BETTER_AUTH_URL;

  return {
    authorization_servers: [getOAuthAuthorizationServerUrl(baseURL)],
    bearer_methods_supported: ["header"],
    jwks_uri: getConfiguredOAuthJwksUrl(baseURL),
    resource: getOAuthProtectedResourceUrl(baseURL),
    scopes_supported: OAUTH_BLOG_SCOPES,
  };
}
