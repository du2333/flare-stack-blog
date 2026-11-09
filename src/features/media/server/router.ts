import { oo } from "@orpc/openapi";
import { os } from "@orpc/server";
import { z } from "zod";
import {
  ACCEPTED_IMAGE_TYPES,
  DeleteMediaResultSchema,
  DeleteUnusedMediaResultSchema,
  GetMediaListInputSchema,
  ImportMediaUrlInputSchema,
  LinkedMomentSchema,
  LinkedPostSchema,
  MAX_FILE_SIZE,
  MEDIA_INVALID_DETAILS,
  type MediaInvalidDetail,
  MediaKeyInputSchema,
  MediaListPageSchema,
  MediaSelectSchema,
  MediaStatsSchema,
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
  MEDIA_IN_USE: {
    status: 409,
    message: "Media is referenced by a post or a Moment.",
  },
  MEDIA_INVALID: {
    status: 400,
    message: "Invalid media upload.",
    data: z.object({
      detail: z
        .enum(MEDIA_INVALID_DETAILS)
        .describe(
          `Why the file is refused. TYPE_MISMATCH: the bytes are not the image type the file declares. TYPE_UNRECOGNIZED: a downloaded response is not one of ${ACCEPTED_IMAGE_TYPES.join(", ")}. EMPTY: a downloaded response has no bytes. TOO_LARGE: a downloaded response is over ${MAX_FILE_SIZE / 1024 / 1024} MB. TYPE_CHANGED: a replacement is not the image type of the file it replaces.`,
        ),
    }),
  },
  MEDIA_NOT_FOUND: { status: 404, message: "Media not found." },
  MEDIA_INVALID_URL: { status: 400, message: "Invalid image URL." },
  MEDIA_IMPORT_FAILED: { status: 400, message: "Could not import image." },
} as const;

const MEDIA_INVALID_MESSAGES: Record<MediaInvalidDetail, string> = {
  TYPE_MISMATCH:
    "The file's bytes are not the image type it declares, so it was not stored.",
  TYPE_UNRECOGNIZED: `The response is not an accepted image type (${ACCEPTED_IMAGE_TYPES.join(", ")}).`,
  EMPTY: "The response has no bytes.",
  TOO_LARGE: `The response is larger than ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
  TYPE_CHANGED:
    "The new file is not the same image type as the file it replaces, so nothing was replaced.",
};

/** The `MEDIA_INVALID` error with the reason the file is refused. */
function mediaInvalid(
  errors: {
    MEDIA_INVALID: (options: {
      message: string;
      data: { detail: MediaInvalidDetail };
    }) => Error;
  },
  { detail }: { detail: MediaInvalidDetail },
) {
  return errors.MEDIA_INVALID({
    message: `Invalid media upload: ${MEDIA_INVALID_MESSAGES[detail]}`,
    data: { detail },
  });
}

const imageFile = z
  .file()
  .max(MAX_FILE_SIZE)
  .mime([...ACCEPTED_IMAGE_TYPES]);

// The file reaches the procedure only as a multipart part; the generator also
// offers the input as JSON, which no client can send a file in. The document
// declares the one body that works.
const multipartImageBody = oo.spec(
  os.middleware(({ next }) => next()),
  (operation) => ({
    ...operation,
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              image: {
                type: "string",
                format: "binary",
                description: `The image file, at most ${MAX_FILE_SIZE / 1024 / 1024} MB, sent as a multipart part with its content type: ${ACCEPTED_IMAGE_TYPES.join(", ")}. The bytes must be that type; a mismatch answers 400 MEDIA_INVALID.`,
              },
            },
            required: ["image"],
            additionalProperties: false,
          },
          encoding: {
            image: { contentType: ACCEPTED_IMAGE_TYPES.join(", ") },
          },
        },
      },
    },
  }),
);

const list = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media",
    summary: "List media",
    description:
      "Lists the media library, newest first, a page at a time (20 by default). search matches file names. unusedOnly keeps the images nothing uses, the ones DELETE /admin/media/unused would delete. postCount counts the posts that use each image in the draft or the published version; revisionOnlyPostCount counts the posts that use it only in a Post Revision; momentCount counts the Moments that show it. An image is unreferenced when all three are 0.",
    tags: ["Admin Media"],
  })
  .input(GetMediaListInputSchema)
  .output(MediaListPageSchema)
  .handler(({ context, input }) => MediaService.getMediaList(context, input));

const upload = adminProcedure
  .errors({
    MEDIA_RECORD_CREATE_FAILED: mediaErrors.MEDIA_RECORD_CREATE_FAILED,
    MEDIA_INVALID: mediaErrors.MEDIA_INVALID,
  })
  .use(multipartImageBody)
  .route({
    method: "POST",
    path: "/admin/media",
    summary: "Upload an image",
    description:
      "Stores an image in the media library from a multipart/form-data body with one part, image. Returns the new Media; use its url as the src of an image in a post body, or its id as a post's coverMediaId. Answers 400 MEDIA_INVALID when the file's bytes are not the type it declares; data.detail says why.",
    tags: ["Admin Media"],
  })
  .input(
    z.strictObject({
      image: imageFile,
    }),
  )
  .output(MediaSelectSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.upload(context, { file: input.image }), {
      MEDIA_RECORD_CREATE_FAILED: () => {
        throw errors.MEDIA_RECORD_CREATE_FAILED();
      },
      MEDIA_INVALID: (error) => {
        throw mediaInvalid(errors, error);
      },
    }),
  );

const importFromUrl = adminProcedure
  .errors({
    MEDIA_RECORD_CREATE_FAILED: mediaErrors.MEDIA_RECORD_CREATE_FAILED,
    MEDIA_INVALID_URL: mediaErrors.MEDIA_INVALID_URL,
    MEDIA_IMPORT_FAILED: mediaErrors.MEDIA_IMPORT_FAILED,
    MEDIA_INVALID: mediaErrors.MEDIA_INVALID,
  })
  .route({
    method: "POST",
    path: "/admin/media/import",
    summary: "Import an image from a URL",
    description:
      "Downloads a public http(s) image and stores it in the media library, as an upload would. Its file name is name when given, else the last part of the address, ending in the extension of the downloaded image type; without a usable name it is image.<extension>. Answers 400 MEDIA_INVALID_URL for an address that is not public: a loopback, private, link-local or reserved IP in any notation, a local name, a name any of whose DNS answers is such an address, or a redirect to any of these or to a name public DNS has no address for, such as an intranet host. Redirects are followed up to five times. Answers MEDIA_IMPORT_FAILED when the download fails or the name does not resolve, and MEDIA_INVALID when the response is not an accepted image type, is empty or over the size limit, or its bytes are not that type; data.detail says which.",
    tags: ["Admin Media"],
  })
  .input(ImportMediaUrlInputSchema)
  .output(MediaSelectSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.importFromUrl(context, input), {
      MEDIA_RECORD_CREATE_FAILED: () => {
        throw errors.MEDIA_RECORD_CREATE_FAILED();
      },
      MEDIA_INVALID_URL: () => {
        throw errors.MEDIA_INVALID_URL();
      },
      MEDIA_IMPORT_FAILED: () => {
        throw errors.MEDIA_IMPORT_FAILED();
      },
      MEDIA_INVALID: (error) => {
        throw mediaInvalid(errors, error);
      },
    }),
  );

const stats = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media/stats",
    summary: "Get media library stats",
    description:
      "Counts the images in the media library, how many of them nothing uses, and their total size in bytes.",
    tags: ["Admin Media"],
  })
  .output(MediaStatsSchema)
  .handler(({ context }) => MediaService.getMediaStats(context));

const totalSize = adminProcedure
  .route({
    method: "GET",
    path: "/admin/media/size",
    summary: "Get total media size",
    description: "The total size of the media library in bytes.",
    tags: ["Admin Media"],
  })
  .output(z.number().int())
  .handler(({ context }) => MediaService.getTotalMediaSize(context));

const linkedKeys = adminProcedure
  .route({
    method: "POST",
    path: "/admin/media/linked-keys",
    summary: "Resolve which media keys are linked",
    description:
      "Returns the given keys that a post uses, in its draft, its published version or a Post Revision, or that a Moment shows. Media with such a key cannot be deleted.",
    tags: ["Admin Media"],
  })
  .input(z.strictObject({ keys: z.array(z.string()) }))
  .output(z.array(z.string()))
  .handler(({ context, input }) =>
    MediaService.getLinkedMediaKeys(context, input.keys),
  );

const removeUnused = adminProcedure
  .route({
    method: "DELETE",
    path: "/admin/media/unused",
    summary: "Delete unused media",
    description:
      "Deletes every image no post uses (draft, published version or Post Revision), no Moment shows and no Admin has as an avatar. Cannot be undone.",
    tags: ["Admin Media"],
  })
  .output(DeleteUnusedMediaResultSchema)
  .handler(async ({ context }) => {
    const result = await MediaService.deleteUnused(context);
    if (result.data === null) throw new Error("Expected ok result");
    return result;
  });

const remove = adminProcedure
  .errors({
    MEDIA_IN_USE: mediaErrors.MEDIA_IN_USE,
    MEDIA_NOT_FOUND: mediaErrors.MEDIA_NOT_FOUND,
  })
  .route({
    method: "DELETE",
    path: "/admin/media/{key}",
    summary: "Delete media",
    description:
      "Deletes one image. Answers 404 MEDIA_NOT_FOUND when no Media has the key, and 409 MEDIA_IN_USE while a post uses it (draft, published version or Post Revision), a Moment shows it or an Admin has it as an avatar; GET /admin/media/{key}/posts lists the posts and GET /admin/media/{key}/moments lists the Moments. The check and the delete are one step: a post or Moment saved with the image at the same moment either makes the delete answer 409 MEDIA_IN_USE or is itself refused, so none is left showing a deleted image. Cannot be undone.",
    tags: ["Admin Media"],
  })
  .input(MediaKeyInputSchema)
  .output(DeleteMediaResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.deleteImage(context, input.key.trim()), {
      MEDIA_IN_USE: () => {
        throw errors.MEDIA_IN_USE();
      },
      MEDIA_NOT_FOUND: () => {
        throw errors.MEDIA_NOT_FOUND();
      },
    }),
  );

const linkedPosts = adminProcedure
  .errors({ MEDIA_NOT_FOUND: mediaErrors.MEDIA_NOT_FOUND })
  .route({
    method: "GET",
    path: "/admin/media/{key}/posts",
    summary: "List posts linked to media",
    description:
      "Lists the posts that use the image in their body or as their cover, in the draft, the published version or a Post Revision. revisionsOnly marks a post whose Post Revisions alone use it. A key no Media has answers 404 MEDIA_NOT_FOUND; Media no post uses answers an empty list.",
    tags: ["Admin Media"],
  })
  .input(MediaKeyInputSchema)
  .output(z.array(LinkedPostSchema))
  .handler(async ({ context, input, errors }) => {
    const key = input.key.trim();
    if (!(await MediaService.mediaExists(context, key))) {
      throw errors.MEDIA_NOT_FOUND();
    }
    return MediaService.getLinkedPosts(context, key);
  });

const linkedMoments = adminProcedure
  .errors({ MEDIA_NOT_FOUND: mediaErrors.MEDIA_NOT_FOUND })
  .route({
    method: "GET",
    path: "/admin/media/{key}/moments",
    summary: "List Moments linked to media",
    description:
      "Lists the Moments that show the image, newest first. title is the start of the Moment's text, or a name for an image Moment when it has none. A key no Media has answers 404 MEDIA_NOT_FOUND; Media no Moment shows answers an empty list.",
    tags: ["Admin Media"],
  })
  .input(MediaKeyInputSchema)
  .output(z.array(LinkedMomentSchema))
  .handler(async ({ context, input, errors }) => {
    const key = input.key.trim();
    if (!(await MediaService.mediaExists(context, key))) {
      throw errors.MEDIA_NOT_FOUND();
    }
    return MediaService.getLinkedMoments(context, key);
  });

const replace = adminProcedure
  .errors({
    MEDIA_NOT_FOUND: mediaErrors.MEDIA_NOT_FOUND,
    MEDIA_INVALID: mediaErrors.MEDIA_INVALID,
  })
  .use(multipartImageBody)
  .route({
    method: "POST",
    path: "/admin/media/{key}/replace",
    summary: "Replace media file",
    description:
      "Puts a new file at the same key, from a multipart/form-data body with one part, image. Every post that uses the image shows the new file at once, on the public site and in the editor, without being saved: no post is written, so none gains Unpublished Changes or a new saveToken. The Media's fileName becomes the uploaded file's name, or stays as it was when the part has none. Returns the updated Media. The new file must be the same image type as the one it replaces (a PNG stays a PNG, jpg and jpeg are one type): another type answers 400 MEDIA_INVALID with data.detail TYPE_CHANGED and nothing is replaced, so upload a new image instead. Answers 404 MEDIA_NOT_FOUND when no Media has the key and 400 MEDIA_INVALID when the file's bytes are not the type it declares (data.detail says why).",
    tags: ["Admin Media"],
  })
  .input(
    z.strictObject({
      key: z.string(),
      image: imageFile,
    }),
  )
  .output(MediaSelectSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      MediaService.replaceImage(context, {
        key: input.key.trim(),
        file: input.image,
      }),
      {
        MEDIA_NOT_FOUND: () => {
          throw errors.MEDIA_NOT_FOUND();
        },
        MEDIA_INVALID: (error) => {
          throw mediaInvalid(errors, error);
        },
      },
    ),
  );

// The rename answers 200 with an empty body, which a response schema cannot
// say: the document describes the response without a body instead.
const emptyResponse = oo.spec(
  os.middleware(({ next }) => next()),
  (operation) => ({
    ...operation,
    responses: {
      ...operation.responses,
      200: { description: "Renamed. The response body is empty." },
    },
  }),
);

const updateName = adminProcedure
  .errors({ MEDIA_NOT_FOUND: mediaErrors.MEDIA_NOT_FOUND })
  .use(emptyResponse)
  .route({
    method: "PATCH",
    path: "/admin/media/{key}",
    summary: "Rename media",
    description:
      "Changes the image's file name in the media library. Its key and address stay. The name follows the rules of a tag name: trimmed, not empty, no control or format characters, at most 255 characters; otherwise 400. Answers 404 MEDIA_NOT_FOUND when no Media has the key.",
    tags: ["Admin Media"],
  })
  .input(UpdateMediaNameInputSchema)
  .output(z.void())
  .handler(({ context, input, errors }) =>
    unwrapResult(MediaService.updateMediaName(context, input), {
      MEDIA_NOT_FOUND: () => {
        throw errors.MEDIA_NOT_FOUND();
      },
    }),
  );

export default {
  list,
  upload,
  importFromUrl,
  stats,
  totalSize,
  linkedKeys,
  removeUnused,
  remove,
  linkedPosts,
  linkedMoments,
  replace,
  updateName,
};
