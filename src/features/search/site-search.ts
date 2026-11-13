import { z } from "zod/mini";

/** `?q=` of the site search page. */
export const siteSearchSchema = z.object({
  q: z.optional(z.string()),
});
