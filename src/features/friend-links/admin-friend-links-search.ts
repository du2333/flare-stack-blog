import { z } from "zod/mini";
import { SEARCH_TEXT_MAX_LENGTH } from "@/lib/constants";
import { FRIEND_LINK_STATUSES } from "@/lib/enum-values";

/** The Admin's Friend Links address. */
export const adminFriendLinksSearchSchema = z.object({
  search: z.catch(
    z._default(z.string().check(z.maxLength(SEARCH_TEXT_MAX_LENGTH)), ""),
    "",
  ),
  status: z.catch(
    z._default(z.enum(FRIEND_LINK_STATUSES), "pending"),
    "pending",
  ),
  page: z.catch(z._default(z.int().check(z.positive()), 1), 1),
});
