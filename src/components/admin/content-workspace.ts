export function isAdminContentWorkspace(pathname: string) {
  return (
    /^\/admin\/?$/.test(pathname) ||
    /^\/admin\/(posts|media|tags|friend-links|muted-users)\/?$/.test(pathname)
  );
}

// Keep this breakpoint aligned with content-workspace.css.
export const LOW_WORKSPACE_HEIGHT = "(max-height: 540px)";
