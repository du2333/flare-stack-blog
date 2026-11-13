import { z } from "zod/mini";
import {
  SORT_FIELDS,
  STATUS_FILTERS,
} from "@/features/posts/components/post-manager/types";
import { adminPageParam } from "@/lib/admin-search";

/** The Admin's Posts list address. */
export const adminPostsSearchSchema = z.object({
  page: adminPageParam,
  status: z.catch(z._default(z.enum(STATUS_FILTERS), "ALL"), "ALL"),
  sortBy: z.catch(z._default(z.enum(SORT_FIELDS), "updatedAt"), "updatedAt"),
  search: z.catch(z._default(z.string(), ""), ""),
  category: z.catch(
    z.optional(z.union([z.int().check(z.positive()), z.literal("none")])),
    undefined,
  ),
  tag: z.catch(z.optional(z.int().check(z.positive())), undefined),
});

export type AdminPostsSearch = z.infer<typeof adminPostsSearchSchema>;
