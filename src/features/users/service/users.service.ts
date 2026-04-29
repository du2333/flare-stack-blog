import * as UsersRepo from "@/features/users/data/users.data";
import type {
  GetUsersInput,
  UpdateUserRoleInput,
} from "@/features/users/users.schema";

export async function getUsers(context: DbContext, input: GetUsersInput) {
  return await UsersRepo.getUsers(context.db, input);
}

export async function updateUserRole(
  context: DbContext,
  input: UpdateUserRoleInput,
) {
  // Guard: Cannot modify superadmin via this API
  const targetUser = await UsersRepo.findUserById(context.db, input.userId);
  if (!targetUser) {
    return { error: { reason: "USER_NOT_FOUND" as const } };
  }
  if (targetUser.role === "superadmin") {
    return { error: { reason: "CANNOT_MODIFY_SUPERADMIN" as const } };
  }

  const updated = await UsersRepo.updateUserRole(
    context.db,
    input.userId,
    input.role,
  );

  if (!updated) {
    return { error: { reason: "USER_NOT_FOUND" as const } };
  }

  return { data: updated };
}
