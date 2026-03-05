export type Result<TData, TError extends { reason: string }> =
  | {
      data: TData;
      error: null;
    }
  | {
      error: TError;
      data: null;
    };

export function unwrap<TData>(
  result: Result<TData, { reason: string }>,
): TData {
  if (result.error) {
    throw new Error(`Expected ok, got error: ${result.error.reason}`);
  }
  return result.data;
}

export function ok<TData>(data: TData): Result<TData, never> {
  return { data, error: null };
}

export function err<
  const TReason extends string,
  TError extends { reason: TReason },
>(error: TError): Result<never, TError> {
  return { error, data: null };
}
