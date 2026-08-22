/** Server UTC calendar date (YYYY-MM-DD). */
export function serverUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * True when the stored publish date's UTC calendar day is after server today.
 * Date-picker values are stored as `YYYY-MM-DDT12:00:00Z`.
 */
export function isFuturePublishDate(
  publishedAtISO: string,
  serverToday = serverUtcDateString(),
): boolean {
  return publishedAtISO.slice(0, 10) > serverToday;
}
