import { z } from "zod/mini";

/** `?redirectTo=` of the sign-in page. */
export const loginSearchSchema = z.object({
  redirectTo: z.optional(z.string()),
});

/** The same of an old entry point, which leads to the sign-in page whatever it is given. */
export const legacyAuthSearchSchema = z.object({
  redirectTo: z.catch(z.optional(z.string()), undefined),
});
