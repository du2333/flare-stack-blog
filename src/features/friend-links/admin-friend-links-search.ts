import { z } from "zod";
import { SEARCH_TEXT_MAX_LENGTH } from "@/lib/constants";
import { FRIEND_LINK_STATUSES } from "@/lib/enum-values";

/** The Admin's Friend Links address. */
export const adminFriendLinksSearchSchema = z.object({
  search: z
    .string()
    .max(SEARCH_TEXT_MAX_LENGTH)
    .optional()
    .default("")
    .catch(""),
  status: z
    .enum(FRIEND_LINK_STATUSES)
    .optional()
    .default("pending")
    .catch("pending"),
  page: z.number().int().positive().optional().default(1).catch(1),
});
