import { isDefinedError, type ORPCError } from "@orpc/client";

type DefinedORPCError<TError> = Extract<TError, ORPCError<string, unknown>>;

type ORPCErrorHandlerOptions<TError> = {
  defined: {
    [TCode in DefinedORPCError<TError>["code"]]?: (
      error: Extract<DefinedORPCError<TError>, { code: TCode }>,
    ) => void;
  };
  fallback: (error: Exclude<TError, DefinedORPCError<TError>>) => void;
};

export function handleORPCError<TError>(
  error: TError,
  { defined, fallback }: ORPCErrorHandlerOptions<TError>,
) {
  if (isDefinedError(error)) {
    const handlers = defined as Record<
      string,
      (error: DefinedORPCError<TError>) => void
    >;
    handlers[error.code]?.(error);
    return;
  }

  fallback(error as Exclude<TError, DefinedORPCError<TError>>);
}
