type DateLike = Date | string | null | undefined;

export function serializeMcpDate(value: Date | string): string;
export function serializeMcpDate(value: null | undefined): null;
export function serializeMcpDate(value: DateLike): string | null;
export function serializeMcpDate(value: DateLike) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? null;
}
