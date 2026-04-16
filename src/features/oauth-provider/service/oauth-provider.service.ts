import type { OAuthScope } from "../oauth-provider.shared";
import { OAUTH_PROVIDER_SCOPES } from "../oauth-provider.shared";
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

export function extractBearerToken(authorization?: string | null) {
  if (!authorization) return null;

  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || null;
  }

  return authorization.trim() || null;
}

export function parseOAuthScopes(scopeClaim: unknown): OAuthScope[] {
  const scopes =
    typeof scopeClaim === "string"
      ? scopeClaim.split(" ")
      : Array.isArray(scopeClaim)
        ? scopeClaim
        : [];

  if (scopes.length === 0) {
    return [];
  }

  return scopes
    .map((scope) => scope.trim())
    .filter(
      (scope): scope is OAuthScope =>
        scope.length > 0 && OAUTH_SCOPE_SET.has(scope),
    );
}

export function createOAuthPrincipalFromProps(
  props: Record<string, unknown>,
): OAuthPrincipal {
  return {
    clientId: typeof props.clientId === "string" ? props.clientId : null,
    scopes: parseOAuthScopes(props.scopes),
    subject:
      typeof props.subject === "string"
        ? props.subject
        : typeof props.userId === "string"
          ? props.userId
          : null,
  };
}

export function createOAuthPrincipal(
  tokenLike: Record<string, unknown>,
): OAuthPrincipal {
  return createOAuthPrincipalFromProps({
    clientId:
      typeof tokenLike.client_id === "string"
        ? tokenLike.client_id
        : tokenLike.azp,
    scopes: tokenLike.scope,
    subject: tokenLike.sub,
    userId: tokenLike.sub,
  });
}
