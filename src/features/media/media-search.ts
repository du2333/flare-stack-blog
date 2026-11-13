import { z } from "zod";
import { MEDIA_SORTS } from "@/features/media/utils/media.utils";

/** The Admin's Media library address. */
export const mediaSearchSchema = z.object({
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  unused: z.boolean().optional().catch(false),
  search: z.string().optional().catch(undefined),
  sort: z.enum(MEDIA_SORTS).optional().catch(undefined),
});
