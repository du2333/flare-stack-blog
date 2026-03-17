type DateLike = Date | string | null | undefined;

export function serializeMcpDate(value: DateLike) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? null;
}
