import { createServerFn } from "@tanstack/react-start";
import * as UsersService from "@/features/users/service/users.service";
import {
  GetUsersInputSchema,
  UpdateUserRoleInputSchema,
} from "@/features/users/users.schema";
import { superAdminMiddleware } from "@/lib/middlewares";

export const getUsersFn = createServerFn()
  .middleware([superAdminMiddleware])
  .inputValidator(GetUsersInputSchema)
  .handler(({ data, context }) => UsersService.getUsers(context, data));

export const updateUserRoleFn = createServerFn({
  method: "POST",
})
  .middleware([superAdminMiddleware])
  .inputValidator(UpdateUserRoleInputSchema)
  .handler(({ data, context }) => UsersService.updateUserRole(context, data));
