import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { APIError } from "better-call";
import type { JWTPayload } from "jose";
import { serverEnv } from "@/lib/env/server.env";
import { findOAuthAccessTokenByToken } from "../data/oauth-provider.data";
import {
  getOAuthProtectedResourceUrl,
  type OAuthScope,
} from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";
import {
  assertOpaqueAccessTokenIsActive,
  assertOpaqueAccessTokenScopes,
  buildOpaqueAccessTokenPayload,
  createOAuthVerificationError,
  hashOpaqueAccessToken,
  isLikelyJwtAccessToken,
  isOpaqueAccessToken,
  parsePersistedScopes,
} from "../utils/oauth-provider-access-token";
import {
  getOAuthAuthorizationServer,
  getOAuthJwksUrl,
  normalizeRequiredScopes,
} from "./oauth-provider.service";

async function findStoredOpaqueAccessToken(db: DB, accessToken: string) {
  const storedToken = await hashOpaqueAccessToken(accessToken);
  return await findOAuthAccessTokenByToken(db, storedToken);
}

async function verifyOpaqueOAuthAccessToken(
  db: DB,
  env: Env,
  requestUrl: string,
  accessToken: string,
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
): Promise<JWTPayload> {
  const tokenRecord = await findStoredOpaqueAccessToken(db, accessToken);
  if (!tokenRecord) {
    throw createOAuthVerificationError(
      requestUrl,
      "UNAUTHORIZED",
      "token invalid",
    );
  }

  const now = new Date();
  const { expiresAt } = assertOpaqueAccessTokenIsActive(
    requestUrl,
    tokenRecord,
    now,
  );
  const grantedScopes = parsePersistedScopes(tokenRecord.scopes);

  assertOpaqueAccessTokenScopes(requestUrl, grantedScopes, requiredScopes);

  return buildOpaqueAccessTokenPayload(
    env,
    tokenRecord,
    expiresAt,
    grantedScopes,
  );
}

export async function verifyOAuthAccessToken(
  db: DB,
  env: Env,
  requestUrl: string,
  accessToken: string,
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) {
  if (isOpaqueAccessToken(accessToken)) {
    return await verifyOpaqueOAuthAccessToken(
      db,
      env,
      requestUrl,
      accessToken,
      requiredScopes,
    );
  }

  const resourceClient = oauthProviderResourceClient().getActions();

  try {
    return await resourceClient.verifyAccessToken(accessToken, {
      jwksUrl: getOAuthJwksUrl(env),
      scopes: normalizeRequiredScopes(requiredScopes),
      verifyOptions: {
        audience: getOAuthProtectedResourceUrl(serverEnv(env).BETTER_AUTH_URL),
        issuer: getOAuthAuthorizationServer(env),
      },
    });
  } catch (error) {
    if (
      error instanceof APIError &&
      typeof error.body?.message === "string" &&
      error.body.message === "no token payload" &&
      !isLikelyJwtAccessToken(accessToken)
    ) {
      return await verifyOpaqueOAuthAccessToken(
        db,
        env,
        requestUrl,
        accessToken,
        requiredScopes,
      );
    }

    throw error;
  }
}
