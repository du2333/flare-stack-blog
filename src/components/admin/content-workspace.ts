export function isAdminContentWorkspace(pathname: string) {
  return /^\/admin\/(posts|media|tags|friend-links)\/?$/.test(pathname);
}

// Keep this breakpoint aligned with content-workspace.css.
export const LOW_WORKSPACE_HEIGHT = "(max-height: 540px)";
