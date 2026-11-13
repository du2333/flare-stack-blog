import { z } from "zod";

/** `?q=` of the site search page. */
export const siteSearchSchema = z.object({
  q: z.string().optional(),
});
