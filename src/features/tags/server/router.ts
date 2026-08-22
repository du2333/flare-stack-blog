import {
  CreateTagInputSchema,
  DeleteTagInputSchema,
  GetTagsByPostIdInputSchema,
  GetTagsInputSchema,
  SetPostTagsInputSchema,
  UpdateTagInputSchema,
} from "@/features/tags/tags.schema";
import * as TagService from "@/features/tags/tags.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const tagErrors = {
  TAG_NOT_FOUND: { status: 404, message: "Tag not found." },
  TAG_NAME_ALREADY_EXISTS: { status: 409, message: "Tag name already exists." },
} as const;

const list = publicProcedure
  .route({
    method: "GET",
    path: "/tags",
    summary: "List public tags",
    tags: ["Tags"],
  })
  .handler(({ context }) => TagService.getPublicTags(context));

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/tags",
    summary: "List tags for admin",
    tags: ["Admin Tags"],
  })
  .input(GetTagsInputSchema)
  .handler(({ context, input }) => TagService.getTags(context, input));

const adminListWithCount = adminProcedure
  .route({
    method: "GET",
    path: "/admin/tags/with-count",
    summary: "List tags with post counts",
    tags: ["Admin Tags"],
  })
  .input(GetTagsInputSchema)
  .handler(({ context, input }) => TagService.getTagsWithCount(context, input));

const create = adminProcedure
  .errors(tagErrors)
  .route({
    method: "POST",
    path: "/admin/tags",
    summary: "Create a tag",
    tags: ["Admin Tags"],
  })
  .input(CreateTagInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(TagService.createTag(context, input), {
      TAG_NAME_ALREADY_EXISTS: () => {
        throw errors.TAG_NAME_ALREADY_EXISTS();
      },
    }),
  );

const update = adminProcedure
  .errors(tagErrors)
  .route({
    method: "PATCH",
    path: "/admin/tags/{id}",
    summary: "Update a tag",
    tags: ["Admin Tags"],
  })
  .input(UpdateTagInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(TagService.updateTag(context, input), {
      TAG_NOT_FOUND: () => {
        throw errors.TAG_NOT_FOUND();
      },
      TAG_NAME_ALREADY_EXISTS: () => {
        throw errors.TAG_NAME_ALREADY_EXISTS();
      },
    }),
  );

const remove = adminProcedure
  .errors(tagErrors)
  .route({
    method: "DELETE",
    path: "/admin/tags/{id}",
    summary: "Delete a tag",
    tags: ["Admin Tags"],
  })
  .input(DeleteTagInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(TagService.deleteTag(context, input), {
      TAG_NOT_FOUND: () => {
        throw errors.TAG_NOT_FOUND();
      },
    }),
  );

const setPostTags = adminProcedure
  .route({
    method: "PUT",
    path: "/admin/posts/{postId}/tags",
    summary: "Set tags on a post",
    tags: ["Admin Tags"],
  })
  .input(SetPostTagsInputSchema)
  .handler(({ context, input }) => TagService.setPostTags(context, input));

const byPostId = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/{postId}/tags",
    summary: "List tags for a post",
    tags: ["Admin Tags"],
  })
  .input(GetTagsByPostIdInputSchema)
  .handler(({ context, input }) => TagService.getTagsByPostId(context, input));

export default {
  list,
  admin: {
    list: adminList,
    listWithCount: adminListWithCount,
    create,
    update,
    remove,
    setPostTags,
    byPostId,
  },
};
