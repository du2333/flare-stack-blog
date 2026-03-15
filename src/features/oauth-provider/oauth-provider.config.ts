import { oauthProvider } from "@better-auth/oauth-provider";
import { jwt } from "better-auth/plugins";
import { flattenBlogScopeGroups } from "./service/oauth-provider.scope";

export const OAUTH_PROVIDER_LOGIN_PAGE = "/login";
export const OAUTH_PROVIDER_CONSENT_PAGE = "/oauth/consent";

const OAUTH_STANDARD_SCOPE_VALUES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export const OAUTH_BLOG_SCOPE_GROUPS = {
  posts: ["read", "write"],
  comments: ["read", "write"],
  media: ["read", "write"],
  settings: ["read", "write"],
} as const;

export type OAuthStandardScope = (typeof OAUTH_STANDARD_SCOPE_VALUES)[number];
export type OAuthBlogScopeGroups = typeof OAUTH_BLOG_SCOPE_GROUPS;
export type OAuthBlogResource = keyof OAuthBlogScopeGroups;
export type OAuthBlogAction<R extends OAuthBlogResource> =
  OAuthBlogScopeGroups[R][number];

export type OAuthBlogScope = {
  [R in OAuthBlogResource]: `${R}:${OAuthBlogAction<R>}`;
}[OAuthBlogResource];
export type OAuthScope = OAuthStandardScope | OAuthBlogScope;

export const OAUTH_STANDARD_SCOPES = [...OAUTH_STANDARD_SCOPE_VALUES];
export const OAUTH_BLOG_SCOPES = flattenBlogScopeGroups(
  OAUTH_BLOG_SCOPE_GROUPS,
);
export const OAUTH_PROVIDER_SCOPES: OAuthScope[] = [
  ...OAUTH_STANDARD_SCOPE_VALUES,
  ...OAUTH_BLOG_SCOPES,
];

export const OAUTH_DEFAULT_CLIENT_SCOPES: OAuthScope[] = [
  "openid",
  "profile",
  "email",
  "posts:read",
];

export const oauthJwtPlugin = jwt({
  disableSettingJwtHeader: true,
  jwks: {
    jwksPath: "/.well-known/jwks.json",
  },
});

export const oauthProviderPlugin = oauthProvider({
  loginPage: OAUTH_PROVIDER_LOGIN_PAGE,
  consentPage: OAUTH_PROVIDER_CONSENT_PAGE,
  scopes: OAUTH_PROVIDER_SCOPES,
  allowDynamicClientRegistration: true,
  allowUnauthenticatedClientRegistration: true,
  clientRegistrationDefaultScopes: OAUTH_DEFAULT_CLIENT_SCOPES,
  clientRegistrationAllowedScopes: OAUTH_PROVIDER_SCOPES,
  clientCredentialGrantDefaultScopes: OAUTH_DEFAULT_CLIENT_SCOPES,
});
