import type {
  OAuthBlogAction,
  OAuthBlogResource,
  OAuthBlogScope,
  OAuthBlogScopeGroups,
} from "../oauth-provider.config";
import type { OAuthScopeRequest } from "../schema/oauth-provider.schema";

function typedEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as Array<{
    [K in keyof T & string]: [K, T[K]];
  }[keyof T & string]>;
}

function toBlogScope<R extends OAuthBlogResource>(
  resource: R,
  action: OAuthBlogAction<R>,
): OAuthBlogScope {
  return `${resource}:${action}`;
}

export function flattenBlogScopeGroups(
  scopeGroups: OAuthBlogScopeGroups,
): OAuthBlogScope[] {
  return typedEntries(scopeGroups).flatMap(([resource, actions]) =>
    actions.map((action) => toBlogScope(resource, action)),
  );
}

export function flattenScopeRequest(
  scopeRequest: OAuthScopeRequest,
): OAuthBlogScope[] {
  return typedEntries(scopeRequest).flatMap(([resource, actions]) =>
    (actions ?? []).map((action) => toBlogScope(resource, action)),
  );
}
