import { base64Url } from "@better-auth/utils/base64";
import { createHash } from "@better-auth/utils/hash";
import { APIError } from "better-call";
import type { JWTPayload } from "jose";
import type { OAuthScope } from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";
import {
  getMissingScopes,
  getOAuthAuthorizationServer,
  getOAuthProtectedResourceMetadataUrl,
} from "../service/oauth-provider.service";

const OPAQUE_ACCESS_TOKEN_SEGMENT_COUNT = 1;
const JWT_ACCESS_TOKEN_SEGMENT_COUNT = 3;

export interface OAuthAccessTokenRecordLike {
  clientId: string;
  createdAt: Date | null;
  expiresAt: Date | null;
  scopes: unknown;
  sessionId: string | null;
  userId: string | null;
  oauthClient: {
    disabled: boolean | null;
  } | null;
  session: {
    expiresAt: Date;
  } | null;
}

export function createOAuthVerificationError(
  requestUrl: string,
  status: "UNAUTHORIZED" | "FORBIDDEN",
  message: string,
) {
  return new APIError(
    status,
    { message },
    {
      "WWW-Authenticate": `Bearer resource_metadata="${getOAuthProtectedResourceMetadataUrl(requestUrl)}"`,
    },
  );
}

function parsePersistedJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function parsePersistedScopes(scopes: unknown): OAuthScope[] {
  const parsedScopes = parsePersistedJson(scopes);

  if (!Array.isArray(parsedScopes)) {
    return [];
  }

  return parsedScopes.filter(
    (scope): scope is OAuthScope => typeof scope === "string",
  );
}

export function getTokenSegmentCount(token: string) {
  return token.split(".").length;
}

export function isLikelyJwtAccessToken(token: string) {
  return getTokenSegmentCount(token) === JWT_ACCESS_TOKEN_SEGMENT_COUNT;
}

export function isOpaqueAccessToken(token: string) {
  return getTokenSegmentCount(token) === OPAQUE_ACCESS_TOKEN_SEGMENT_COUNT;
}

export async function hashOpaqueAccessToken(token: string) {
  const hash = await createHash("SHA-256").digest(
    new TextEncoder().encode(token),
  );
  return base64Url.encode(new Uint8Array(hash), { padding: false });
}

export function assertOpaqueAccessTokenIsActive(
  requestUrl: string,
  tokenRecord: OAuthAccessTokenRecordLike,
  now: Date,
) {
  if (!tokenRecord.expiresAt || tokenRecord.expiresAt < now) {
    throw createOAuthVerificationError(
      requestUrl,
      "UNAUTHORIZED",
      "token expired",
    );
  }

  if (!tokenRecord.oauthClient || tokenRecord.oauthClient.disabled) {
    throw createOAuthVerificationError(
      requestUrl,
      "UNAUTHORIZED",
      "token inactive",
    );
  }

  if (
    tokenRecord.sessionId &&
    (!tokenRecord.session || tokenRecord.session.expiresAt < now)
  ) {
    throw createOAuthVerificationError(
      requestUrl,
      "UNAUTHORIZED",
      "token inactive",
    );
  }

  return {
    expiresAt: tokenRecord.expiresAt,
  };
}

export function assertOpaqueAccessTokenScopes(
  requestUrl: string,
  grantedScopes: OAuthScope[],
  requiredScopes: OAuthScope[] | OAuthScopeRequest,
) {
  const missingScopes = getMissingScopes(grantedScopes, requiredScopes);
  if (missingScopes.length === 0) {
    return;
  }

  throw createOAuthVerificationError(
    requestUrl,
    "FORBIDDEN",
    `invalid scope ${missingScopes[0]}`,
  );
}

export function buildOpaqueAccessTokenPayload(
  env: Env,
  tokenRecord: OAuthAccessTokenRecordLike,
  expiresAt: Date,
  grantedScopes: OAuthScope[],
): JWTPayload {
  return {
    active: true,
    azp: tokenRecord.clientId,
    client_id: tokenRecord.clientId,
    exp: Math.floor(expiresAt.getTime() / 1000),
    iat: tokenRecord.createdAt
      ? Math.floor(tokenRecord.createdAt.getTime() / 1000)
      : undefined,
    iss: getOAuthAuthorizationServer(env),
    scope: grantedScopes.join(" "),
    sid: tokenRecord.sessionId ?? undefined,
    sub: tokenRecord.userId ?? undefined,
  };
}
