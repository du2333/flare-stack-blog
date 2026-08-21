type AnyResult<TData> = {
  data: TData | null;
  error: { reason: string } | null;
};

export async function unwrapResult<TData>(
  resultPromise: Promise<AnyResult<TData>> | AnyResult<TData>,
  throwers: Record<string, () => never>,
): Promise<TData> {
  const result = await resultPromise;
  if (result.error) {
    const thrower = throwers[result.error.reason];
    if (thrower) {
      thrower();
    }
    throw new Error(result.error.reason);
  }
  if (result.data === null) {
    throw new Error("Expected ok result");
  }
  return result.data;
}
