import { createServerFn } from "@tanstack/react-start";
import {
  FindPostRevisionByIdInputSchema,
  ListPostRevisionsInputSchema,
  RestorePostRevisionInputSchema,
} from "@/features/posts/post-revisions.schema";
import * as PostRevisionService from "@/features/posts/post-revisions.service";
import { adminMiddleware } from "@/lib/middlewares";

export const listPostRevisionsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(ListPostRevisionsInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.listPostRevisions(context, data),
  );

export const getPostRevisionFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(FindPostRevisionByIdInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.findPostRevisionById(context, data),
  );

export const restorePostRevisionFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(RestorePostRevisionInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.restorePostRevision(context, data),
  );
