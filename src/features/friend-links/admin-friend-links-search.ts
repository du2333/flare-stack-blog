import { z } from "zod/mini";
import { adminPageParam, adminSearchTextParam } from "@/lib/admin-search";
import { FRIEND_LINK_STATUSES } from "@/lib/enum-values";

/** The Admin's Friend Links address. */
export const adminFriendLinksSearchSchema = z.object({
  search: adminSearchTextParam,
  status: z.catch(
    z._default(z.enum(FRIEND_LINK_STATUSES), "pending"),
    "pending",
  ),
  page: adminPageParam,
});
