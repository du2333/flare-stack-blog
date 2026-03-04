import { createServerFn } from "@tanstack/react-start";
import { SubmitFriendLinkInputSchema } from "../friend-links.schema";
import * as FriendLinkService from "../friend-links.service";
import {
  authMiddleware,
  createRateLimitMiddleware,
  dbMiddleware,
  turnstileMiddleware,
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
    turnstileMiddleware,
    authMiddleware,
  ])
  .inputValidator(SubmitFriendLinkInputSchema)
  .handler(
    async ({ data, context }) =>
      await FriendLinkService.submitFriendLink(context, data),
  );

export const getApprovedFriendLinksFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    return await FriendLinkService.getApprovedFriendLinks(context);
  });

export const getMyFriendLinksFn = createServerFn()
  .middleware([authMiddleware])
  .handler(
    async ({ context }) => await FriendLinkService.getMyFriendLinks(context),
  );
