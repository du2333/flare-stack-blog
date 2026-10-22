import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/lib/middlewares";
import {
  CreateMomentInputSchema,
  DeleteMomentInputSchema,
  GetAdminMomentsInputSchema,
  UpdateMomentInputSchema,
} from "../moments.schema";
import * as MomentsService from "../moments.service";

export const getAdminMomentsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetAdminMomentsInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsService.getAdminMoments(context, data);
  });

export const createMomentFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(CreateMomentInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsService.createMoment(context, data);
  });

export const updateMomentFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(UpdateMomentInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsService.updateMoment(context, data);
  });

export const deleteMomentFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(DeleteMomentInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsService.deleteMoment(context, data);
  });
