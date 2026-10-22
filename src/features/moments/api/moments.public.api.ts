import { createServerFn } from "@tanstack/react-start";
import { dbMiddleware } from "@/lib/middlewares";
import { GetMomentsInputSchema } from "../moments.schema";
import * as MomentsService from "../moments.service";

export const getMomentsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetMomentsInputSchema)
  .handler(async ({ data, context }) => {
    return await MomentsService.getMoments(context, data);
  });
