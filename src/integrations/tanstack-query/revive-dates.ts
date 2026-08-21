const DATE_KEYS = new Set([
  "publishedAt",
  "updatedAt",
  "createdAt",
  "pinnedAt",
  "registeredAt",
]);

export function reviveQueryDates<T>(value: T): T {
  return revive(value) as T;
}

function revive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(revive);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (DATE_KEYS.has(key) && typeof nested === "string") {
        const date = new Date(nested);
        next[key] = Number.isNaN(date.getTime()) ? nested : date;
      } else {
        next[key] = revive(nested);
      }
    }
    return next;
  }
  return value;
}
