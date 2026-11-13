import { z } from "zod";
import { MAX_PAGE_NUMBER } from "@/lib/constants";

/** `?page=` of the Home and Moments lists; one that names no page is no filter. */
export const pageSearchSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_NUMBER)
    .optional()
    .catch(undefined),
});

/** `?comment=` of a Post or Moment page: the Comment to scroll to. */
export const commentSearchSchema = z.object({
  comment: z.coerce.number().optional(),
});
