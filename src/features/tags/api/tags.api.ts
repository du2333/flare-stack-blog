import { createServerFn } from "@tanstack/react-start";
import * as AIService from "@/features/ai/ai.service";
import {
  CreateTagInputSchema,
  DeleteTagInputSchema,
  GenerateTagsInputSchema,
  GetTagsByPostIdInputSchema,
  GetTagsInputSchema,
  SetPostTagsInputSchema,
  UpdateTagInputSchema,
} from "@/features/tags/tags.schema";
import * as TagService from "@/features/tags/tags.service";
import { adminMiddleware, dbMiddleware } from "@/lib/middlewares";

// ============ Public API ============

export const getTagsFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    return await TagService.getPublicTags(context);
  });

// ============ Admin API ============

// Admin version without function-level caching (uses service-level KV cache)
export const getTagsAdminFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetTagsInputSchema)
  .handler(async ({ data, context }) => {
    return await TagService.getTags(context, data);
  });

export const createTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(CreateTagInputSchema)
  .handler(({ data, context }) => TagService.createTag(context, data));

export const updateTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UpdateTagInputSchema)
  .handler(({ data, context }) => TagService.updateTag(context, data));

export const deleteTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(DeleteTagInputSchema)
  .handler(({ data, context }) => TagService.deleteTag(context, data));

export const setPostTagsFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(SetPostTagsInputSchema)
  .handler(({ data, context }) => TagService.setPostTags(context, data));

export const getTagsByPostIdFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetTagsByPostIdInputSchema)
  .handler(({ data, context }) => TagService.getTagsByPostId(context, data));

export const getTagsWithCountAdminFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetTagsInputSchema)
  .handler(async ({ data, context }) => {
    return await TagService.getTagsWithCount(context, data);
  });

export const generateTagsFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(GenerateTagsInputSchema)
  .handler(async ({ data, context }) => {
    return await AIService.generateTags(
      context,
      {
        title: data.title,
        summary: data.summary,
        content: data.content,
      },
      data.existingTags,
    );
  });
