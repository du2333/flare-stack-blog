import { z } from "zod";
import {
  AdminPostListPageSchema,
  DeletePostInputSchema,
  FindPostByIdInputSchema,
  AdjacentPostsSchema,
  FindPostBySlugInputSchema,
  GenerateSlugInputSchema,
  GetPostsCursorInputSchema,
  GetPostsInputSchema,
  AdminPostSchema,
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
  PublishPostInputSchema,
  UnpublishPostInputSchema,
  UpdatePostInputSchema,
} from "@/features/posts/schema/posts.schema";
import {
  DeletePostRevisionsInputSchema,
  FindPostRevisionByIdInputSchema,
  ListPostRevisionsInputSchema,
  PostRevisionListItemSchema,
  PostRevisionSelectSchema,
  RestorePostRevisionInputSchema,
} from "@/features/posts/schema/post-revisions.schema";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const postErrors = {
  POST_NOT_FOUND: { status: 404, message: "Post not found." },
  POST_REVISION_NOT_FOUND: { status: 404, message: "Post revision not found." },
  POST_REVISION_INVALID_SNAPSHOT: {
    status: 400,
    message: "Post revision snapshot is invalid.",
  },
  PUBLISHED_AT_IN_FUTURE: {
    status: 400,
    message: "Publish date cannot be in the future.",
  },
  PUBLIC_SLUG_TAKEN: {
    status: 409,
    message: "This public slug is already in use.",
  },
  MEDIA_NOT_FOUND: { status: 404, message: "Media not found." },
  CATEGORY_NOT_FOUND: { status: 404, message: "Category not found." },
} as const;

const list = publicProcedure
  .route({
    method: "GET",
    path: "/posts",
    summary: "List published posts",
    tags: ["Posts"],
  })
  .input(GetPostsCursorInputSchema)
  .output(PostListResponseSchema)
  .handler(async ({ context, input }) => {
    const result = await PostService.getPostsCursor(context, input);
    return {
      ...result,
      items: await postPopularityService.attachViewCounts(
        context,
        result.items,
      ),
    };
  });

const bySlug = publicProcedure
  .route({
    method: "GET",
    path: "/posts/{slug}",
    summary: "Get a published post by slug",
    tags: ["Posts"],
  })
  .input(FindPostBySlugInputSchema)
  .output(PostWithTocSchema)
  .handler(({ context, input }) => PostService.findPostBySlug(context, input));

const adjacent = publicProcedure
  .route({
    method: "GET",
    path: "/posts/{slug}/adjacent",
    summary: "Get the adjacent published posts by publication date",
    tags: ["Posts"],
  })
  .input(FindPostBySlugInputSchema)
  .output(AdjacentPostsSchema)
  .handler(({ context, input }) =>
    PostService.getAdjacentPosts(context, input),
  );

const pinned = publicProcedure
  .route({
    method: "GET",
    path: "/posts/pinned",
    summary: "List pinned published posts",
    tags: ["Posts"],
  })
  .output(z.array(PostItemSchema))
  .handler(async ({ context }) =>
    postPopularityService.attachViewCounts(
      context,
      await PostService.getPinnedPosts(context),
    ),
  );

const popular = publicProcedure
  .route({
    method: "GET",
    path: "/posts/popular",
    summary: "List popular published posts",
    tags: ["Posts"],
  })
  .input(z.object({ limit: z.number().int().min(1).max(20).optional() }))
  .output(z.array(PostItemSchema))
  .handler(({ context, input }) =>
    postPopularityService.getPopular(context, input.limit),
  );

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts",
    summary: "List posts for admin",
    tags: ["Admin Posts"],
  })
  .input(GetPostsInputSchema)
  .output(AdminPostListPageSchema)
  .handler(({ context, input }) =>
    PostService.listAdminPostsPage(context, input),
  );

const adminGet = adminProcedure
  .errors(postErrors)
  .route({
    method: "GET",
    path: "/admin/posts/{id}",
    summary: "Get a post by id",
    tags: ["Admin Posts"],
  })
  .input(FindPostByIdInputSchema)
  .output(AdminPostSchema)
  .handler(({ context, input }) => PostService.findPostById(context, input));

const generateSlug = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/slug",
    summary: "Generate a post slug",
    tags: ["Admin Posts"],
  })
  .input(GenerateSlugInputSchema)
  .handler(({ context, input }) => PostService.generateSlug(context, input));

const create = adminProcedure
  .route({
    method: "POST",
    path: "/admin/posts",
    summary: "Get or create an empty draft post",
    tags: ["Admin Posts"],
  })
  .handler(({ context }) => PostService.createEmptyPost(context));

const update = adminProcedure
  .errors(postErrors)
  .route({
    method: "PATCH",
    path: "/admin/posts/{id}",
    summary: "Update a post",
    tags: ["Admin Posts"],
  })
  .input(UpdatePostInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.updatePost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
      MEDIA_NOT_FOUND: () => {
        throw errors.MEDIA_NOT_FOUND();
      },
      CATEGORY_NOT_FOUND: () => {
        throw errors.CATEGORY_NOT_FOUND();
      },
    }),
  );

const remove = adminProcedure
  .errors(postErrors)
  .route({
    method: "DELETE",
    path: "/admin/posts/{id}",
    summary: "Delete a post",
    tags: ["Admin Posts"],
  })
  .input(DeletePostInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.deletePost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const publishPost = adminProcedure
  .errors(postErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{id}/publish",
    summary: "Publish a post",
    description:
      "Publishes the post and replaces its public snapshot. This endpoint does not highlight code. Unchanged code keeps highlighting already in the snapshot; new or edited code is published as plain text. Publish from the admin editor if you need highlighted code.",
    tags: ["Admin Posts"],
  })
  .input(PublishPostInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.publishPost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
      PUBLISHED_AT_IN_FUTURE: () => {
        throw errors.PUBLISHED_AT_IN_FUTURE();
      },
      PUBLIC_SLUG_TAKEN: () => {
        throw errors.PUBLIC_SLUG_TAKEN();
      },
    }),
  );

const unpublishPost = adminProcedure
  .errors(postErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{id}/unpublish",
    summary: "Unpublish a post",
    tags: ["Admin Posts"],
  })
  .input(UnpublishPostInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.unpublishPost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const listRevisions = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/{postId}/revisions",
    summary: "List post revisions",
    tags: ["Admin Posts"],
  })
  .input(ListPostRevisionsInputSchema)
  .output(z.array(PostRevisionListItemSchema))
  .handler(({ context, input }) =>
    PostRevisionService.listPostRevisions(context, input),
  );

const getRevision = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/{postId}/revisions/{revisionId}",
    summary: "Get a post revision",
    tags: ["Admin Posts"],
  })
  .input(FindPostRevisionByIdInputSchema)
  .output(PostRevisionSelectSchema.nullable())
  .handler(
    async ({ context, input }) =>
      (await PostRevisionService.findPostRevisionById(context, input)) ?? null,
  );

const restoreRevision = adminProcedure
  .errors(postErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{postId}/revisions/{revisionId}/restore",
    summary: "Restore a post revision",
    tags: ["Admin Posts"],
  })
  .input(RestorePostRevisionInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostRevisionService.restorePostRevision(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
      POST_REVISION_NOT_FOUND: () => {
        throw errors.POST_REVISION_NOT_FOUND();
      },
      POST_REVISION_INVALID_SNAPSHOT: () => {
        throw errors.POST_REVISION_INVALID_SNAPSHOT();
      },
    }),
  );

const deleteRevisions = adminProcedure
  .errors(postErrors)
  .route({
    method: "DELETE",
    path: "/admin/posts/{postId}/revisions",
    summary: "Delete post revisions",
    tags: ["Admin Posts"],
  })
  .input(DeletePostRevisionsInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostRevisionService.deletePostRevisions(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

export default {
  list,
  bySlug,
  adjacent,
  pinned,
  popular,
  admin: {
    list: adminList,
    get: adminGet,
    generateSlug,
    create,
    update,
    remove,
    publish: publishPost,
    unpublish: unpublishPost,
    revisions: {
      list: listRevisions,
      get: getRevision,
      restore: restoreRevision,
      remove: deleteRevisions,
    },
  },
};
