import { createServerFn } from "@tanstack/react-start";
import { SubmitFriendLinkInputSchema } from "../friend-links.schema";
import * as FriendLinkService from "../friend-links.service";
import {
  authMiddleware,
  createRateLimitMiddleware,
  dbMiddleware,
} from "@/lib/middlewares";

export const submitFriendLinkFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 3,
      interval: "1h",
      key: "friend-links:submit",
    }),
    authMiddleware,
  ])
  .inputValidator(SubmitFriendLinkInputSchema)
  .handler(async ({ data, context }) => {
    return await FriendLinkService.submitFriendLink(context, data);
  });

export const getApprovedFriendLinksFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    return await FriendLinkService.getApprovedFriendLinks(context);
  });

export const getMyFriendLinksFn = createServerFn()
  .middleware([
    createRateLimitMiddleware({
      capacity: 30,
      interval: "1m",
      key: "friend-links:getMine",
    }),
    authMiddleware,
  ])
  .handler(async ({ context }) => {
    return await FriendLinkService.getMyFriendLinks(context);
  });
