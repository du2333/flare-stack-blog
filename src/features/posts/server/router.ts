import { z } from "zod";
import {
  DeletePostInputSchema,
  FindPostByIdInputSchema,
  FindPostBySlugInputSchema,
  FindRelatedPostsInputSchema,
  GenerateSlugInputSchema,
  GetPostsCountInputSchema,
  GetPostsCursorInputSchema,
  GetPostsInputSchema,
  AdminPostSchema,
  PostItemSchema,
  PostListResponseSchema,
  PostWithTocSchema,
  PreviewSummaryInputSchema,
  StartPostProcessInputSchema,
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
import * as PageviewService from "@/features/pageview/service/pageview.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const postErrors = {
  POST_NOT_FOUND: { status: 404, message: "Post not found." },
  POST_REVISION_NOT_FOUND: { status: 404, message: "Post revision not found." },
  POST_REVISION_INVALID_SNAPSHOT: {
    status: 400,
    message: "Post revision snapshot is invalid.",
  },
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
  .handler(({ context, input }) => PostService.getPostsCursor(context, input));

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

const related = publicProcedure
  .route({
    method: "GET",
    path: "/posts/{slug}/related",
    summary: "List related published posts",
    tags: ["Posts"],
  })
  .input(FindRelatedPostsInputSchema)
  .output(z.array(PostItemSchema))
  .handler(({ context, input }) => PostService.getRelatedPosts(context, input));

const pinned = publicProcedure
  .route({
    method: "GET",
    path: "/posts/pinned",
    summary: "List pinned published posts",
    tags: ["Posts"],
  })
  .output(z.array(PostItemSchema))
  .handler(({ context }) => PostService.getPinnedPosts(context));

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
    PageviewService.getPopularPosts(context, input.limit),
  );

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts",
    summary: "List posts for admin",
    tags: ["Admin Posts"],
  })
  .input(GetPostsInputSchema)
  .handler(({ context, input }) => PostService.getPosts(context, input));

const adminCount = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/count",
    summary: "Count posts for admin",
    tags: ["Admin Posts"],
  })
  .input(GetPostsCountInputSchema)
  .handler(({ context, input }) => PostService.getPostsCount(context, input));

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
    summary: "Create an empty draft post",
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

const previewSummary = adminProcedure
  .route({
    method: "POST",
    path: "/admin/posts/preview-summary",
    summary: "Preview a post summary",
    tags: ["Admin Posts"],
  })
  .input(PreviewSummaryInputSchema)
  .handler(({ context, input }) => PostService.previewSummary(context, input));

const processPost = adminProcedure
  .route({
    method: "POST",
    path: "/admin/posts/{id}/process",
    summary: "Start post processing workflow",
    tags: ["Admin Posts"],
  })
  .input(StartPostProcessInputSchema)
  .handler(({ context, input }) =>
    PostService.startPostProcessWorkflow(context, input),
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
  related,
  pinned,
  popular,
  admin: {
    list: adminList,
    count: adminCount,
    get: adminGet,
    generateSlug,
    create,
    update,
    remove,
    previewSummary,
    process: processPost,
    revisions: {
      list: listRevisions,
      get: getRevision,
      restore: restoreRevision,
      remove: deleteRevisions,
    },
  },
};
