import {
  ApproveFriendLinkInputSchema,
  CreateFriendLinkInputSchema,
  DeleteFriendLinkInputSchema,
  GetAllFriendLinksInputSchema,
  RejectFriendLinkInputSchema,
  SubmitFriendLinkInputSchema,
  UpdateFriendLinkInputSchema,
} from "@/features/friend-links/friend-links.schema";
import * as FriendLinkService from "@/features/friend-links/friend-links.service";
import {
  adminProcedure,
  authProcedure,
  publicProcedure,
  turnstileMiddleware,
  withRateLimit,
} from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const friendLinkErrors = {
  DUPLICATE_URL: { status: 409, message: "Friend link URL already exists." },
  NOT_FOUND: { status: 404, message: "Friend link not found." },
} as const;

const listApproved = publicProcedure
  .route({
    method: "GET",
    path: "/friend-links",
    summary: "List approved friend links",
    tags: ["Friend Links"],
  })
  .handler(({ context }) => FriendLinkService.getApprovedFriendLinks(context));

const submit = authProcedure
  .use(
    withRateLimit({
      capacity: 3,
      interval: "1h",
      key: "friend-links:submit",
    }),
  )
  .use(turnstileMiddleware)
  .errors(friendLinkErrors)
  .route({
    method: "POST",
    path: "/friend-links",
    summary: "Submit a friend link",
    tags: ["Friend Links"],
  })
  .input(SubmitFriendLinkInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(FriendLinkService.submitFriendLink(context, input), {
      DUPLICATE_URL: () => {
        throw errors.DUPLICATE_URL();
      },
    }),
  );

const mine = authProcedure
  .route({
    method: "GET",
    path: "/me/friend-links",
    summary: "List the current user's friend links",
    tags: ["Friend Links"],
  })
  .handler(({ context }) => FriendLinkService.getMyFriendLinks(context));

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/friend-links",
    summary: "List friend links for admin",
    tags: ["Admin Friend Links"],
  })
  .input(GetAllFriendLinksInputSchema)
  .handler(({ context, input }) =>
    FriendLinkService.getAllFriendLinks(context, input),
  );

const create = adminProcedure
  .errors(friendLinkErrors)
  .route({
    method: "POST",
    path: "/admin/friend-links",
    summary: "Create a friend link",
    tags: ["Admin Friend Links"],
  })
  .input(CreateFriendLinkInputSchema)
  .handler(({ context, input }) =>
    FriendLinkService.createFriendLink(context, input),
  );

const update = adminProcedure
  .errors(friendLinkErrors)
  .route({
    method: "PATCH",
    path: "/admin/friend-links/{id}",
    summary: "Update a friend link",
    tags: ["Admin Friend Links"],
  })
  .input(UpdateFriendLinkInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(FriendLinkService.updateFriendLink(context, input), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
    }),
  );

const approve = adminProcedure
  .errors(friendLinkErrors)
  .route({
    method: "POST",
    path: "/admin/friend-links/{id}/approve",
    summary: "Approve a friend link",
    tags: ["Admin Friend Links"],
  })
  .input(ApproveFriendLinkInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(FriendLinkService.approveFriendLink(context, input), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
    }),
  );

const reject = adminProcedure
  .errors(friendLinkErrors)
  .route({
    method: "POST",
    path: "/admin/friend-links/{id}/reject",
    summary: "Reject a friend link",
    tags: ["Admin Friend Links"],
  })
  .input(RejectFriendLinkInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(FriendLinkService.rejectFriendLink(context, input), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
    }),
  );

const remove = adminProcedure
  .errors(friendLinkErrors)
  .route({
    method: "DELETE",
    path: "/admin/friend-links/{id}",
    summary: "Delete a friend link",
    tags: ["Admin Friend Links"],
  })
  .input(DeleteFriendLinkInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(FriendLinkService.deleteFriendLink(context, input), {
      NOT_FOUND: () => {
        throw errors.NOT_FOUND();
      },
    }),
  );

export default {
  listApproved,
  submit,
  mine,
  admin: {
    list: adminList,
    create,
    update,
    approve,
    reject,
    remove,
  },
};
