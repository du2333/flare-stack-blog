import type {
  OAuthBlogAction,
  OAuthBlogResource,
  OAuthBlogScope,
  OAuthBlogScopeGroups,
  OAuthBlogScopeSelection,
} from "../oauth-provider.shared";

function typedEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as Array<
    {
      [K in keyof T & string]: [K, T[K]];
    }[keyof T & string]
  >;
}

function toBlogScope<R extends OAuthBlogResource>(
  resource: R,
  action: OAuthBlogAction<R>,
): OAuthBlogScope {
  return `${resource}:${action}` as OAuthBlogScope;
}

export type OAuthBlogScopesInput =
  | OAuthBlogScopeGroups
  | OAuthBlogScopeSelection;

export function flattenBlogScopes(
  blogScopes: OAuthBlogScopesInput,
): OAuthBlogScope[] {
  return typedEntries(blogScopes).flatMap(([resource, actions]) =>
    (actions ?? []).map((action) => toBlogScope(resource, action)),
  );
}
