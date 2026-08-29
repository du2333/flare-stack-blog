import { z } from "zod";
import {
  MuteUserInputSchema,
  MutedUserSchema,
  UnmuteUserInputSchema,
} from "@/features/muted-users/muted-users.schema";
import * as MutedUserService from "@/features/muted-users/service/muted-users.service";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const muteErrors = {
  USER_NOT_FOUND: { status: 404, message: "User not found." },
  CANNOT_MUTE_ADMIN: { status: 403, message: "An admin cannot be muted." },
} as const;

const list = adminProcedure
  .route({
    method: "GET",
    path: "/admin/muted-users",
    summary: "List currently muted users",
    tags: ["Admin Muted Users"],
  })
  .output(z.array(MutedUserSchema))
  .handler(({ context }) => MutedUserService.listMutedUsers(context));

const mute = adminProcedure
  .errors(muteErrors)
  .route({
    method: "POST",
    path: "/admin/muted-users",
    summary: "Mute a user",
    tags: ["Admin Muted Users"],
  })
  .input(MuteUserInputSchema)
  .output(MutedUserSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MutedUserService.muteUser(context, input), {
      USER_NOT_FOUND: () => {
        throw errors.USER_NOT_FOUND();
      },
      CANNOT_MUTE_ADMIN: () => {
        throw errors.CANNOT_MUTE_ADMIN();
      },
    }),
  );

const unmute = adminProcedure
  .errors(muteErrors)
  .route({
    method: "DELETE",
    path: "/admin/muted-users/{userId}",
    summary: "Unmute a user",
    tags: ["Admin Muted Users"],
  })
  .input(UnmuteUserInputSchema)
  .output(z.object({ success: z.boolean() }))
  .handler(({ context, input, errors }) =>
    unwrapResult(MutedUserService.unmuteUser(context, input), {
      USER_NOT_FOUND: () => {
        throw errors.USER_NOT_FOUND();
      },
    }),
  );

export default {
  list,
  mute,
  unmute,
};
