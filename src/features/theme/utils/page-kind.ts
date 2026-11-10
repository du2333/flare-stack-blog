import type { PageKind } from "../theme-shell";

/** Pages inside the public site that show only their own content. */
const FOCUSED_PATHS = new Set(["/submit-friend-link", "/profile"]);

/**
 * A route error or not found makes any page focused, the home page included.
 * Sign-in pages are the routes under `/_auth`.
 */
export function resolvePageKind({
  pathname,
  isAuthRoute,
  hasRouteError,
}: {
  pathname: string;
  isAuthRoute: boolean;
  hasRouteError: boolean;
}): PageKind {
  if (hasRouteError || isAuthRoute || FOCUSED_PATHS.has(pathname)) {
    return "focused";
  }
  return pathname === "/" ? "home" : "inner";
}
