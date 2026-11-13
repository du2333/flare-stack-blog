// Tabs tell each other that the session changed through a localStorage key,
// whose `storage` event reaches every other tab of the site. The key and the
// message are Better Auth's own, so a tab still running an older build, whose
// Better Auth client listens there, hears it too.
const SESSION_MESSAGE_KEY = "better-auth.message";

// Better Auth's client looks again on focus at most this often.
const FOCUS_CHECK_INTERVAL_MS = 5_000;

type SessionTrigger = "signed-in" | "signed-out" | "updateUser";

/** Tells the site's other tabs that the session changed in this one. */
export function announceSessionChange(trigger: SessionTrigger) {
  try {
    localStorage.setItem(
      SESSION_MESSAGE_KEY,
      JSON.stringify({
        event: "session",
        data: { trigger },
        clientId: Math.random().toString(36).slice(2),
        timestamp: Math.floor(Date.now() / 1000),
      }),
    );
  } catch {
    // Storage is off: other tabs catch up when they regain focus.
  }
}

/**
 * Calls `listener` whenever the session may have changed outside this tab's
 * own actions: another tab announced a change, the tab became visible again
 * (at most every five seconds), or the network came back (always). These are
 * the moments Better Auth's client looked again.
 */
export function onSessionMayHaveChanged(listener: () => void) {
  let lastFocusCheck = 0;
  const onFocus = () => {
    const now = Date.now();
    if (now - lastFocusCheck < FOCUS_CHECK_INTERVAL_MS) return;
    lastFocusCheck = now;
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_MESSAGE_KEY && event.newValue) listener();
  };
  const onVisibility = () => {
    if (document.visibilityState === "visible") onFocus();
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", listener);
  };
}
