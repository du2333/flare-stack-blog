import { createServerFn } from "@tanstack/react-start";
import {
  FindPostBySlugInputSchema,
  FindRelatedPostsInputSchema,
  GetPostsCursorInputSchema,
} from "@/features/posts/schema/posts.schema";
import * as PostService from "@/features/posts/services/posts.service";
import { dbMiddleware } from "@/lib/middlewares";

export const getPostsCursorFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetPostsCursorInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.getPostsCursor(context, data);
  });

export const findPostBySlugFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(FindPostBySlugInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.findPostBySlug(context, data);
  });

export const getRelatedPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(FindRelatedPostsInputSchema)
  .handler(async ({ data, context }) => {
    return await PostService.getRelatedPosts(context, data);
  });
