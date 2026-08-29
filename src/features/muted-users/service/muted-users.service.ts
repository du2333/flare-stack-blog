import * as MutedUserRepo from "@/features/muted-users/data/muted-users.data";
import { isMuted } from "@/features/muted-users/muted-users";
import type {
  MuteUserInput,
  UnmuteUserInput,
} from "@/features/muted-users/muted-users.schema";
import { err, ok } from "@/lib/errors";

export async function listMutedUsers(context: DbContext) {
  const rows = await MutedUserRepo.listMutedUsers(context.db);
  return rows.filter(
    (row): row is typeof row & { mutedAt: Date } => row.mutedAt != null,
  );
}

export async function muteUser(context: AuthContext, data: MuteUserInput) {
  const target = await MutedUserRepo.findUserById(context.db, data.userId);
  if (!target) {
    return err({ reason: "USER_NOT_FOUND" as const });
  }
  if (target.role === "admin") {
    return err({ reason: "CANNOT_MUTE_ADMIN" as const });
  }
  if (isMuted(target.mutedAt)) {
    return ok({
      id: target.id,
      name: target.name,
      image: target.image,
      mutedAt: target.mutedAt as Date,
    });
  }

  const updated = await MutedUserRepo.setMutedAt(
    context.db,
    data.userId,
    new Date(),
  );
  if (!updated?.mutedAt) {
    return err({ reason: "USER_NOT_FOUND" as const });
  }
  return ok({
    id: updated.id,
    name: updated.name,
    image: updated.image,
    mutedAt: updated.mutedAt,
  });
}

export async function unmuteUser(context: AuthContext, data: UnmuteUserInput) {
  const target = await MutedUserRepo.findUserById(context.db, data.userId);
  if (!target) {
    return err({ reason: "USER_NOT_FOUND" as const });
  }
  if (!isMuted(target.mutedAt)) {
    return ok({ success: true });
  }

  await MutedUserRepo.setMutedAt(context.db, data.userId, null);
  return ok({ success: true });
}
