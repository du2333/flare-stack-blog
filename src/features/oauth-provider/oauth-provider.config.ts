import {
  getOAuthApi,
  type OAuthHelpers,
  type OAuthProviderOptions,
} from "@cloudflare/workers-oauth-provider";
import { seconds } from "@/lib/duration";
import {
  OAUTH_BLOG_SCOPES,
  OAUTH_CLIENT_REGISTRATION_PATH,
  OAUTH_PROVIDER_CONSENT_PAGE,
  OAUTH_PROVIDER_SCOPES,
  OAUTH_TOKEN_PATH,
} from "./oauth-provider.shared";

export const OAUTH_ACCESS_TOKEN_EXPIRES_IN = seconds("1h");
export const OAUTH_REFRESH_TOKEN_EXPIRES_IN = seconds("30d");

type OAuthFetchHandler = ExportedHandler<Env> &
  Pick<Required<ExportedHandler<Env>>, "fetch">;

const oauthHelpersFallbackHandler: OAuthFetchHandler = {
  fetch: () => new Response("Not Found", { status: 404 }),
};

export function createWorkersOAuthProviderOptions(
  handlers: Pick<OAuthProviderOptions<Env>, "apiHandlers" | "defaultHandler">,
): OAuthProviderOptions<Env> {
  return {
    ...handlers,
    accessTokenTTL: OAUTH_ACCESS_TOKEN_EXPIRES_IN,
    allowPlainPKCE: false,
    authorizeEndpoint: OAUTH_PROVIDER_CONSENT_PAGE,
    clientRegistrationEndpoint: OAUTH_CLIENT_REGISTRATION_PATH,
    refreshTokenTTL: OAUTH_REFRESH_TOKEN_EXPIRES_IN,
    resourceMetadata: {
      scopes_supported: OAUTH_BLOG_SCOPES,
    },
    scopesSupported: OAUTH_PROVIDER_SCOPES,
    tokenEndpoint: OAUTH_TOKEN_PATH,
  };
}

export function getOAuthHelpers(env: Env): OAuthHelpers {
  const existingHelpers = env.OAUTH_PROVIDER;

  if (existingHelpers) {
    return existingHelpers;
  }

  return getOAuthApi(
    createWorkersOAuthProviderOptions({
      apiHandlers: {
        "/_oauth": oauthHelpersFallbackHandler,
      },
      defaultHandler: oauthHelpersFallbackHandler,
    }),
    env,
  );
}
