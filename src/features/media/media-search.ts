import { z } from "zod/mini";
import { MEDIA_SORTS } from "@/features/media/utils/media.utils";

/** The Admin's Media library address. */
export const mediaSearchSchema = z.object({
  view: z.catch(z.optional(z.enum(["grid", "list"])), undefined),
  unused: z.catch(z.optional(z.boolean()), false),
  search: z.catch(z.optional(z.string()), undefined),
  sort: z.catch(z.optional(z.enum(MEDIA_SORTS)), undefined),
});
