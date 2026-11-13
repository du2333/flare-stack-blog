import { z } from "zod";

/** `?redirectTo=` of the sign-in page. */
export const loginSearchSchema = z.object({
  redirectTo: z.string().optional(),
});

/** The same of an old entry point, which leads to the sign-in page whatever it is given. */
export const legacyAuthSearchSchema = z.object({
  redirectTo: z.string().optional().catch(undefined),
});
