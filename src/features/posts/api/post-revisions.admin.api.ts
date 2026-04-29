import { createServerFn } from "@tanstack/react-start";
import {
  DeletePostRevisionsInputSchema,
  FindPostRevisionByIdInputSchema,
  ListPostRevisionsInputSchema,
  RestorePostRevisionInputSchema,
} from "@/features/posts/schema/post-revisions.schema";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import { contentAdminMiddleware } from "@/lib/middlewares";

export const listPostRevisionsFn = createServerFn()
  .middleware([contentAdminMiddleware])
  .inputValidator(ListPostRevisionsInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.listPostRevisions(context, data),
  );

export const getPostRevisionFn = createServerFn()
  .middleware([contentAdminMiddleware])
  .inputValidator(FindPostRevisionByIdInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.findPostRevisionById(context, data),
  );

export const restorePostRevisionFn = createServerFn({
  method: "POST",
})
  .middleware([contentAdminMiddleware])
  .inputValidator(RestorePostRevisionInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.restorePostRevision(context, data),
  );

export const deletePostRevisionsFn = createServerFn({
  method: "POST",
})
  .middleware([contentAdminMiddleware])
  .inputValidator(DeletePostRevisionsInputSchema)
  .handler(({ data, context }) =>
    PostRevisionService.deletePostRevisions(context, data),
  );
