import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
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

export const getPinnedPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => PostService.getPinnedPosts(context));

export const getPopularPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(
    z.object({ limit: z.number().int().min(1).max(20).optional() }),
  )
  .handler(({ data, context }) =>
    PageviewService.getPopularPosts(context, data.limit),
  );
