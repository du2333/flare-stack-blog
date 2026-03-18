import { APIError } from "better-call";
import {
  createLocalJWKSet,
  decodeProtectedHeader,
  type JSONWebKeySet,
  type JWTPayload,
  jwtVerify,
} from "jose";
import type { OAuthScope } from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";
import { createOAuthVerificationError } from "../utils/oauth-provider-access-token";
import { normalizeRequiredScopes } from "./oauth-provider.service";

export const LOCAL_OAUTH_JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedJwksEntry {
  cachedAt: number;
  jwks: JSONWebKeySet;
}

interface VerifyLocalOAuthJwtAccessTokenOptions {
  accessToken: string;
  audience: string;
  fetchJwks: () => Promise<JSONWebKeySet>;
  issuer: string;
  now?: () => number;
  requestUrl: string;
  requiredScopes?: OAuthScope[] | OAuthScopeRequest;
}

let cachedJwksEntry: CachedJwksEntry | null = null;

function createInvalidJwtError() {
  const error = new Error("token invalid");
  error.name = "JWTInvalid";
  return error;
}

function hasMatchingKid(jwks: JSONWebKeySet, kid: string | undefined) {
  if (!kid) {
    return false;
  }

  return jwks.keys.some((jwk) => jwk.kid === kid);
}

function isFresh(entry: CachedJwksEntry, now: number) {
  return now - entry.cachedAt < LOCAL_OAUTH_JWKS_CACHE_TTL_MS;
}

function assertValidJwks(jwks: JSONWebKeySet) {
  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error("local jwks response did not contain any keys");
  }
}

function assertJwtScopes(
  requestUrl: string,
  jwt: JWTPayload,
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) {
  const normalizedRequiredScopes = normalizeRequiredScopes(requiredScopes);
  if (normalizedRequiredScopes.length === 0) {
    return;
  }

  const grantedScopes = new Set(
    typeof jwt.scope === "string"
      ? jwt.scope
          .split(" ")
          .map((scope) => scope.trim())
          .filter(Boolean)
      : [],
  );

  for (const scope of normalizedRequiredScopes) {
    if (!grantedScopes.has(scope)) {
      throw createOAuthVerificationError(
        requestUrl,
        "FORBIDDEN",
        `invalid scope ${scope}`,
      );
    }
  }
}

async function getLocalOAuthJwks(
  accessToken: string,
  fetchJwks: () => Promise<JSONWebKeySet>,
  now: number,
) {
  let kid: string | undefined;
  try {
    kid = decodeProtectedHeader(accessToken).kid;
  } catch {
    throw createInvalidJwtError();
  }

  if (
    cachedJwksEntry &&
    isFresh(cachedJwksEntry, now) &&
    hasMatchingKid(cachedJwksEntry.jwks, kid)
  ) {
    return cachedJwksEntry.jwks;
  }

  const jwks = await fetchJwks();
  assertValidJwks(jwks);
  cachedJwksEntry = {
    cachedAt: now,
    jwks,
  };
  return jwks;
}

export function clearLocalOAuthJwksCache() {
  cachedJwksEntry = null;
}

export function readJwtVerificationMetadata(accessToken: string) {
  const tokenSegmentCount = accessToken.split(".").length;

  try {
    const { alg, kid } = decodeProtectedHeader(accessToken);
    return {
      alg: typeof alg === "string" ? alg : null,
      kid: typeof kid === "string" ? kid : null,
      tokenSegmentCount,
    };
  } catch {
    return {
      alg: null,
      kid: null,
      tokenSegmentCount,
    };
  }
}

export async function verifyLocalOAuthJwtAccessToken({
  accessToken,
  audience,
  fetchJwks,
  issuer,
  now = () => Date.now(),
  requestUrl,
  requiredScopes = [],
}: VerifyLocalOAuthJwtAccessTokenOptions): Promise<JWTPayload> {
  try {
    const jwks = await getLocalOAuthJwks(accessToken, fetchJwks, now());
    const jwt = await jwtVerify(accessToken, createLocalJWKSet(jwks), {
      audience,
      issuer,
    });

    if (jwt.payload.azp) {
      jwt.payload.client_id = jwt.payload.azp;
    }

    assertJwtScopes(requestUrl, jwt.payload, requiredScopes);
    return jwt.payload;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "JWTExpired" ||
        error.name === "JWTInvalid" ||
        error.name === "JWSInvalid" ||
        error.name === "JWSSignatureVerificationFailed")
    ) {
      throw createOAuthVerificationError(
        requestUrl,
        "UNAUTHORIZED",
        error.name === "JWTExpired" ? "token expired" : "token invalid",
      );
    }

    throw error;
  }
}
