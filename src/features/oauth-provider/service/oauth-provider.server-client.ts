import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import type { OAuthScope } from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";
import {
  getOAuthAuthorizationServer,
  getOAuthJwksUrl,
  getOAuthProtectedResource,
  normalizeRequiredScopes,
} from "./oauth-provider.service";

export async function verifyOAuthAccessToken(
  env: Env,
  requestUrl: string,
  accessToken: string,
  requiredScopes: OAuthScope[] | OAuthScopeRequest = [],
) {
  const resourceClient = oauthProviderResourceClient().getActions();

  return await resourceClient.verifyAccessToken(accessToken, {
    jwksUrl: getOAuthJwksUrl(env),
    scopes: normalizeRequiredScopes(requiredScopes),
    verifyOptions: {
      audience: getOAuthProtectedResource(requestUrl),
      issuer: getOAuthAuthorizationServer(env),
    },
  });
}
