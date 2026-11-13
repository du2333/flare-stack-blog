import { z } from "zod";
import {
  SORT_FIELDS,
  STATUS_FILTERS,
} from "@/features/posts/components/post-manager/types";

/** The Admin's Posts list address. */
export const adminPostsSearchSchema = z.object({
  page: z.number().int().positive().optional().default(1).catch(1),
  status: z.enum(STATUS_FILTERS).optional().default("ALL").catch("ALL"),
  sortBy: z
    .enum(SORT_FIELDS)
    .optional()
    .default("updatedAt")
    .catch("updatedAt"),
  search: z.string().optional().default("").catch(""),
  category: z
    .union([z.number().int().positive(), z.literal("none")])
    .optional()
    .catch(undefined),
  tag: z.number().int().positive().optional().catch(undefined),
});

export type AdminPostsSearch = z.infer<typeof adminPostsSearchSchema>;
