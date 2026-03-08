import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  GetMediaListInputSchema,
  UpdateMediaNameInputSchema,
  UploadMediaInputSchema,
} from "@/features/media/media.schema";
import * as MediaService from "@/features/media/service/media.service";
import { adminMiddleware } from "@/lib/middlewares";

export const uploadImageFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UploadMediaInputSchema)
  .handler(({ data: file, context }) => MediaService.upload(context, file));

export const deleteImageFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      key: z.string().min(1, "Image key is required"),
    }),
  )
  .handler(({ data, context }) => MediaService.deleteImage(context, data.key));

export const getMediaFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetMediaListInputSchema)
  .handler(({ data, context }) => MediaService.getMediaList(context, data));

export const getLinkedPostsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      key: z.string().min(1, "Image key is required"),
    }),
  )
  .handler(({ data, context }) =>
    MediaService.getLinkedPosts(context, data.key),
  );

export const getLinkedMediaKeysFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      keys: z.array(z.string()),
    }),
  )
  .handler(({ data, context }) =>
    MediaService.getLinkedMediaKeys(context, data.keys),
  );

export const getTotalMediaSizeFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => MediaService.getTotalMediaSize(context));

export const updateMediaNameFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UpdateMediaNameInputSchema)
  .handler(({ data, context }) => MediaService.updateMediaName(context, data));
