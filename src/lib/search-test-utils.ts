/** What a route's `validateSearch` gives for an input: the parsed search, or `"throws"`. */
export type SearchOutcome = Record<string, unknown> | "throws";

/** The part of Standard Schema a search schema is run through. */
interface SearchSchema {
  "~standard": {
    validate: (input: unknown) => unknown;
  };
}

/**
 * Runs a search schema the way TanStack Router does: through Standard Schema,
 * where issues make `validateSearch` throw and the route show its error page.
 */
export function parseSearch(
  schema: SearchSchema,
  input: unknown,
): SearchOutcome {
  const result = schema["~standard"].validate(input);
  if (result instanceof Promise) throw new Error("A search schema is sync.");
  const { issues, value } = result as {
    issues?: ReadonlyArray<unknown>;
    value?: Record<string, unknown>;
  };
  return issues ? "throws" : (value as Record<string, unknown>);
}
