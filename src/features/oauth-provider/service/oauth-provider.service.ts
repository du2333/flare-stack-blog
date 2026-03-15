import type { ResourceServerMetadata } from "@better-auth/oauth-provider";
import type { JWTPayload } from "jose";
import { serverEnv } from "@/lib/env/server.env";
import type { OAuthScope } from "../oauth-provider.config";
import {
  OAUTH_BLOG_SCOPES,
  OAUTH_PROVIDER_SCOPES,
} from "../oauth-provider.config";
import type {
  OAuthPrincipal,
  OAuthScopeRequest,
} from "../schema/oauth-provider.schema";
import { flattenScopeRequest } from "./oauth-provider.scope";

const OAUTH_SCOPE_SET = new Set<string>(OAUTH_PROVIDER_SCOPES);

export function normalizeRequiredScopes(
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
): OAuthScope[] {
  return Array.isArray(requiredScopes)
    ? requiredScopes
    : flattenScopeRequest(requiredScopes);
}

export function getOAuthProtectedResource(requestUrl: string) {
  return new URL(requestUrl).origin;
}

export function getOAuthAuthorizationServer(env: Env) {
  return serverEnv(env).BETTER_AUTH_URL;
}

export function getOAuthJwksUrl(env: Env) {
  return `${getOAuthAuthorizationServer(env)}/.well-known/jwks.json`;
}

export function extractBearerToken(authorization?: string | null) {
  if (!authorization) return null;

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || null;
  }

  return authorization.trim() || null;
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
  requestUrl: string,
): ResourceServerMetadata {
  return {
    authorization_servers: [getOAuthAuthorizationServer(env)],
    bearer_methods_supported: ["header"],
    jwks_uri: getOAuthJwksUrl(env),
    resource: getOAuthProtectedResource(requestUrl),
    scopes_supported: OAUTH_BLOG_SCOPES,
  };
}
