import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, MINUTE);
  return () => clearInterval(timer);
}

// Whole minutes, so the snapshot holds still between ticks.
function getSnapshot() {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

/**
 * The browser's clock, to the minute, or null on the server and in the first
 * render of a hydrating page. Workers Cache serves a page long after it was
 * rendered, so a time written relative to the server's clock would be wrong
 * on arrival; readers get the date first, and the relative time once the
 * page runs.
 */
export function useMomentClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
