import { invalidate } from "@/features/cache/public-cache";
import { approvedFriendLinks } from "@/features/friend-links/friend-links.cache";
import { publishNotificationEvent } from "@/features/notification/service/notification.publisher";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";
import * as FriendLinkRepo from "./data/friend-links.data";
import type {
  ApproveFriendLinkInput,
  CreateFriendLinkInput,
  DeleteFriendLinkInput,
  GetAllFriendLinksInput,
  RejectFriendLinkInput,
  SubmitFriendLinkInput,
  UpdateFriendLinkInput,
} from "./friend-links.schema";

// ============ Authed User Methods ============

export async function submitFriendLink(
  context: AuthContext & { executionCtx: ExecutionContext },
  data: SubmitFriendLinkInput,
) {
  const existing = await FriendLinkRepo.getFriendLinksByUserId(
    context.db,
    context.session.user.id,
  );
  const hasDuplicateUrl = existing.some(
    (link) => link.siteUrl === data.siteUrl && link.status !== "rejected",
  );
  if (hasDuplicateUrl) {
    return err({ reason: "DUPLICATE_URL" });
  }

  const friendLink = await FriendLinkRepo.insertFriendLink(context.db, {
    siteName: data.siteName,
    siteUrl: data.siteUrl,
    description: data.description,
    logoUrl: data.logoUrl,
    contactEmail: data.contactEmail,
    userId: context.session.user.id,
    status: "pending",
  });

  // Notify admin via email
  const { ADMIN_EMAIL, DOMAIN } = serverEnv(context.env);
  await publishNotificationEvent(context, {
    type: "friend_link.submitted",
    data: {
      to: ADMIN_EMAIL,
      siteName: data.siteName,
      siteUrl: data.siteUrl,
      description: data.description || "",
      submitterName: context.session.user.name,
      reviewUrl: `https://${DOMAIN}/admin/friend-links`,
    },
  });

  return ok(friendLink);
}

export async function getMyFriendLinks(context: AuthContext) {
  return await FriendLinkRepo.getFriendLinksByUserId(
    context.db,
    context.session.user.id,
  );
}

// ============ Public Methods ============

export async function getApprovedFriendLinks(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return approvedFriendLinks.get(context, {});
}

function invalidateCache(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  context.executionCtx.waitUntil(invalidate.friendLinksChanged(context));
}

export async function createFriendLink(
  context: DbContext & { executionCtx: ExecutionContext },
  data: CreateFriendLinkInput,
) {
  const friendLink = await FriendLinkRepo.insertFriendLink(context.db, {
    siteName: data.siteName,
    siteUrl: data.siteUrl,
    description: data.description,
    logoUrl: data.logoUrl,
    contactEmail: data.contactEmail,
    userId: null,
    status: "approved",
  });

  invalidateCache(context);

  return friendLink;
}

export async function getAllFriendLinks(
  context: DbContext,
  data: GetAllFriendLinksInput,
) {
  const [items, total] = await Promise.all([
    FriendLinkRepo.getAllFriendLinks(context.db, {
      offset: data.offset,
      limit: data.limit,
      status: data.status,
    }),
    FriendLinkRepo.getAllFriendLinksCount(context.db, {
      status: data.status,
    }),
  ]);

  return { items, total };
}

export async function approveFriendLink(
  context: DbContext & { executionCtx: ExecutionContext },
  data: ApproveFriendLinkInput,
) {
  const friendLink = await FriendLinkRepo.findFriendLinkById(
    context.db,
    data.id,
  );
  if (!friendLink) {
    return err({ reason: "NOT_FOUND" });
  }

  const updated = await FriendLinkRepo.updateFriendLink(context.db, data.id, {
    status: "approved",
    rejectionReason: null,
  });

  invalidateCache(context);

  // Notify submitter if contactEmail exists
  if (friendLink.contactEmail) {
    const { DOMAIN } = serverEnv(context.env);
    await publishNotificationEvent(context, {
      type: "friend_link.approved",
      data: {
        to: friendLink.contactEmail,
        siteName: friendLink.siteName,
        blogUrl: `https://${DOMAIN}`,
      },
    });
  }

  return ok(updated);
}

export async function rejectFriendLink(
  context: DbContext & { executionCtx: ExecutionContext },
  data: RejectFriendLinkInput,
) {
  const friendLink = await FriendLinkRepo.findFriendLinkById(
    context.db,
    data.id,
  );
  if (!friendLink) {
    return err({ reason: "NOT_FOUND" });
  }

  const updated = await FriendLinkRepo.updateFriendLink(context.db, data.id, {
    status: "rejected",
    rejectionReason: data.rejectionReason,
  });

  if (friendLink.status === "approved") {
    invalidateCache(context);
  }

  // Notify submitter if contactEmail exists
  if (friendLink.contactEmail) {
    await publishNotificationEvent(context, {
      type: "friend_link.rejected",
      data: {
        to: friendLink.contactEmail,
        siteName: friendLink.siteName,
        rejectionReason: data.rejectionReason,
      },
    });
  }

  return ok(updated);
}

export async function updateFriendLink(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdateFriendLinkInput,
) {
  const friendLink = await FriendLinkRepo.findFriendLinkById(
    context.db,
    data.id,
  );
  if (!friendLink) {
    return err({ reason: "NOT_FOUND" });
  }

  const { id, ...updateData } = data;

  const updated = await FriendLinkRepo.updateFriendLink(
    context.db,
    id,
    updateData,
  );

  if (friendLink.status === "approved") {
    invalidateCache(context);
  }

  return ok(updated);
}

export async function deleteFriendLink(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteFriendLinkInput,
) {
  const friendLink = await FriendLinkRepo.findFriendLinkById(
    context.db,
    data.id,
  );
  if (!friendLink) {
    return err({ reason: "NOT_FOUND" });
  }

  await FriendLinkRepo.deleteFriendLink(context.db, data.id);

  if (friendLink.status === "approved") {
    invalidateCache(context);
  }

  return ok({ success: true });
}
