import { defineEntry } from "@/features/cache/public-cache";
import * as FriendLinkRepo from "@/features/friend-links/data/friend-links.data";
import { ApprovedFriendLinksResponseSchema } from "@/features/friend-links/friend-links.schema";

export const approvedFriendLinks = defineEntry({
  name: "friend-links.approved",
  namespace: "friend-links:list",
  key: (_params: Record<string, never>) => ["friend-links", "approved"],
  schema: ApprovedFriendLinksResponseSchema,
  ttl: "7d",
  invalidatedBy: ["friend-links.changed"],
  load: (context) =>
    FriendLinkRepo.getAllFriendLinks(context.db, {
      status: "approved",
      limit: null,
    }),
});
