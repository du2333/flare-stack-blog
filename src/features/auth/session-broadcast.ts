// Tabs tell each other that the session changed through a localStorage key,
// whose `storage` event reaches every other tab of the site. The key and the
// message are Better Auth's own, so a tab still running an older build, whose
// Better Auth client listens there, hears it too.
const SESSION_MESSAGE_KEY = "better-auth.message";

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

/** Calls `listener` whenever another tab announces a session change. */
export function onSessionChangeElsewhere(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_MESSAGE_KEY && event.newValue) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
