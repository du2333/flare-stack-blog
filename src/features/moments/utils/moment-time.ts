/** A Moment posted within this many days shows how long ago; older ones show the date. */
export const MOMENT_RELATIVE_TIME_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a Moment posted at `postedAt` shows a relative time at `now`. */
export function showsRelativeMomentTime(
  postedAt: Date | string | number,
  now: number,
) {
  return (
    now - new Date(postedAt).getTime() < MOMENT_RELATIVE_TIME_DAYS * DAY_MS
  );
}
