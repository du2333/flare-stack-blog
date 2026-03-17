import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { serverEnv } from "@/lib/env/server.env";
import {
  getOAuthProtectedResourceUrl,
  type OAuthScope,
} from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";
import {
  getOAuthAuthorizationServer,
  getOAuthJwksUrl,
  normalizeRequiredScopes,
} from "./oauth-provider.service";

export async function verifyOAuthAccessToken(
  env: Env,
  _requestUrl: string,
  accessToken: string,
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) {
  const resourceClient = oauthProviderResourceClient().getActions();

  return await resourceClient.verifyAccessToken(accessToken, {
    jwksUrl: getOAuthJwksUrl(env),
    scopes: normalizeRequiredScopes(requiredScopes),
    verifyOptions: {
      audience: getOAuthProtectedResourceUrl(serverEnv(env).BETTER_AUTH_URL),
      issuer: getOAuthAuthorizationServer(env),
    },
  });
}
