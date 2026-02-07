import { createServerFn } from "@tanstack/react-start";
import {
  ApproveFriendLinkInputSchema,
  CreateFriendLinkInputSchema,
  DeleteFriendLinkInputSchema,
  GetAllFriendLinksInputSchema,
  RejectFriendLinkInputSchema,
  UpdateFriendLinkInputSchema,
} from "../friend-links.schema";
import * as FriendLinkService from "../friend-links.service";
import { adminMiddleware } from "@/lib/middlewares";

export const getAllFriendLinksFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetAllFriendLinksInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.getAllFriendLinks(context, data);
  });

export const createFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(CreateFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.createFriendLink(context, data);
  });

export const updateFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UpdateFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.updateFriendLink(context, data);
  });

export const approveFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(ApproveFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.approveFriendLink(context, data);
  });

export const rejectFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(RejectFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.rejectFriendLink(context, data);
  });

export const deleteFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(DeleteFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.deleteFriendLink(context, data);
  });
