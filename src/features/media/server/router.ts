import { z } from "zod";
import {
  ACCEPTED_IMAGE_TYPES,
  GetMediaListInputSchema,
  MAX_FILE_SIZE,
  MediaKeyInputSchema,
  UpdateMediaNameInputSchema,
} from "@/features/media/media.schema";
import * as MediaService from "@/features/media/service/media.service";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const mediaErrors = {
  MEDIA_RECORD_CREATE_FAILED: {
    status: 500,
    message: "Failed to create media record.",
  },
  MEDIA_IN_USE: { status: 409, message: "Media is referenced by a post." },
  MEDIA_INVALID: { status: 400, message: "Invalid media upload." },
} as const;

const list = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media",
    summary: "List media",
    tags: ["Admin Media"],
  })
  .input(GetMediaListInputSchema)
  .handler(({ context, input }) => MediaService.getMediaList(context, input));

const upload = adminProcedure
  .errors(mediaErrors)
  .route({
    method: "POST",
    path: "/admin/media",
    summary: "Upload an image",
    tags: ["Admin Media"],
  })
  .input(
    z.object({
      image: z
        .file()
        .max(MAX_FILE_SIZE)
        .mime([...ACCEPTED_IMAGE_TYPES]),
    }),
  )
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.upload(context, { file: input.image }), {
      MEDIA_RECORD_CREATE_FAILED: () => {
        throw errors.MEDIA_RECORD_CREATE_FAILED();
      },
    }),
  );

const remove = adminProcedure
  .errors(mediaErrors)
  .route({
    method: "DELETE",
    path: "/admin/media/{key}",
    summary: "Delete media",
    tags: ["Admin Media"],
  })
  .input(MediaKeyInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.deleteImage(context, input.key.trim()), {
      MEDIA_IN_USE: () => {
        throw errors.MEDIA_IN_USE();
      },
    }),
  );

const linkedPosts = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media/{key}/posts",
    summary: "List posts linked to media",
    tags: ["Admin Media"],
  })
  .input(MediaKeyInputSchema)
  .handler(({ context, input }) =>
    MediaService.getLinkedPosts(context, input.key.trim()),
  );

const linkedKeys = adminProcedure
  .route({
    method: "POST",
    path: "/admin/media/linked-keys",
    summary: "Resolve which media keys are linked",
    tags: ["Admin Media"],
  })
  .input(z.object({ keys: z.array(z.string()) }))
  .handler(({ context, input }) =>
    MediaService.getLinkedMediaKeys(context, input.keys),
  );

const totalSize = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media/size",
    summary: "Get total media size",
    tags: ["Admin Media"],
  })
  .handler(({ context }) => MediaService.getTotalMediaSize(context));

const updateName = adminProcedure
  .route({
    method: "PATCH",
    path: "/admin/media/{key}",
    summary: "Rename media",
    tags: ["Admin Media"],
  })
  .input(UpdateMediaNameInputSchema)
  .handler(({ context, input }) =>
    MediaService.updateMediaName(context, input),
  );

export default {
  list,
  upload,
  remove,
  linkedPosts,
  linkedKeys,
  totalSize,
  updateName,
};
