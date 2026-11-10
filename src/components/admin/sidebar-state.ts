/**
 * Collapsed state of the Admin sidebar. The Admin's saved preference applies
 * everywhere except the post editor, which starts collapsed on every visit; a
 * manual toggle inside the editor lasts only for that stay.
 */
export interface SidebarState {
  /** The saved preference: whether the sidebar is collapsed outside the editor. */
  preference: boolean;
  /** A manual toggle made during the current editor stay; null until one is. */
  editorOverride: boolean | null;
}

export function initialSidebarState(preference: boolean): SidebarState {
  return { preference, editorOverride: null };
}

export function isSidebarCollapsed(state: SidebarState, inEditor: boolean) {
  return inEditor ? (state.editorOverride ?? true) : state.preference;
}

export function toggleSidebar(
  state: SidebarState,
  inEditor: boolean,
): SidebarState {
  const collapsed = !isSidebarCollapsed(state, inEditor);
  return inEditor
    ? { ...state, editorOverride: collapsed }
    : { preference: collapsed, editorOverride: null };
}

/** Called once the Admin is outside the editor, so the next stay starts collapsed. */
export function leaveEditor(state: SidebarState): SidebarState {
  return state.editorOverride === null
    ? state
    : { ...state, editorOverride: null };
}

const SIDEBAR_COOKIE = "admin-sidebar";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** The preference is a cookie so the server can render the right state on the first paint. */
export function parseSidebarPreference(
  cookieHeader: string | null | undefined,
) {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === SIDEBAR_COOKIE) return value === "collapsed";
  }
  return false;
}

export function serializeSidebarPreference(collapsed: boolean) {
  return `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export async function readSidebarPreference() {
  if (import.meta.env.SSR) {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    return parseSidebarPreference(getRequestHeader("cookie"));
  }
  return parseSidebarPreference(document.cookie);
}
