import { createServerFn } from "@tanstack/react-start";
import {
  DeletePostInputSchema,
  FindPostByIdInputSchema,
  FindPostBySlugInputSchema,
  GenerateSlugInputSchema,
  GetPostsCountInputSchema,
  GetPostsInputSchema,
  PreviewSummaryInputSchema,
  StartPostProcessInputSchema,
  UpdatePostInputSchema,
} from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { adminMiddleware } from "@/lib/middlewares";

export const generateSlugFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GenerateSlugInputSchema)
  .handler(({ data, context }) => PostService.generateSlug(context, data));

export const createEmptyPostFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .handler(({ context }) => PostService.createEmptyPost(context));

export const getPostsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetPostsInputSchema)
  .handler(({ data, context }) => PostService.getPosts(context, data));

export const getPostsCountFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetPostsCountInputSchema)
  .handler(({ data, context }) => PostService.getPostsCount(context, data));

export const findPostBySlugFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(FindPostBySlugInputSchema)
  .handler(({ data, context }) =>
    PostService.findPostBySlugAdmin(context, data),
  );

export const findPostByIdFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(FindPostByIdInputSchema)
  .handler(({ data, context }) => PostService.findPostById(context, data));

export const updatePostFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UpdatePostInputSchema)
  .handler(({ data, context }) => PostService.updatePost(context, data));

export const deletePostFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(DeletePostInputSchema)
  .handler(({ data, context }) => PostService.deletePost(context, data));

export const previewSummaryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(PreviewSummaryInputSchema)
  .handler(({ data, context }) => PostService.previewSummary(context, data));

export const startPostProcessWorkflowFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(StartPostProcessInputSchema)
  .handler(({ data, context }) =>
    PostService.startPostProcessWorkflow(context, data),
  );
