import { z } from "zod/mini";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/enum-values";

/** The unsubscribe link's parameters; the page says what is missing. */
export const unsubscribeSearchSchema = z.partial(
  z.object({
    userId: z.string(),
    type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
    token: z.string(),
  }),
);
