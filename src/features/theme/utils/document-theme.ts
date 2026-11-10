import { selectTheme } from "../themes";

/** The route every public page is under; the Admin and the API are not. */
const PUBLIC_ROUTE_ID = "/_public";

/**
 * The `data-theme` of `<html>`: the selected Theme's id while a public page
 * is shown, so its design variables reach what renders outside its shell
 * (dialogs, the table of contents, toasts). Absent anywhere else, the Admin
 * above all, and on a root error, which no Theme styles.
 */
export function documentThemeId(
  routeIds: ReadonlyArray<string>,
  themeId: string | undefined,
): string | undefined {
  if (themeId === undefined || !routeIds.includes(PUBLIC_ROUTE_ID)) {
    return undefined;
  }
  return selectTheme(themeId).id;
}
