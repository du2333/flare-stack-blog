import { z } from "zod";
import {
  AdminMomentSchema,
  CreateMomentInputSchema,
  DeleteMomentResultSchema,
  MomentEditConflictDataSchema,
  MomentIdInputSchema,
  UpdateMomentInputSchema,
} from "@/features/moments/schema/moments.schema";
import * as MomentService from "@/features/moments/services/moments.service";
import type { MomentContentError } from "@/features/moments/services/moments.service";
import {
  MOMENT_IMAGES_MAX,
  MOMENT_TEXT_MAX_LENGTH,
} from "@/features/moments/utils/moment-rules";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const momentNotFoundErrors = {
  MOMENT_NOT_FOUND: { status: 404, message: "Moment not found." },
} as const;

// Every rule a Moment's content is held to, answered by create and update.
const contentErrors = {
  MOMENT_EMPTY: {
    status: 400,
    message: "A Moment needs text, images or a video.",
  },
  MOMENT_TEXT_TOO_LONG: {
    status: 400,
    message: `The text is longer than the ${MOMENT_TEXT_MAX_LENGTH} characters (Unicode code points) a Moment holds.`,
    data: z.object({
      limit: z.number().int().describe("The most characters it may hold."),
      length: z.number().int().describe("The characters it holds, trimmed."),
    }),
  },
  MOMENT_TEXT_INVALID: {
    status: 400,
    message:
      "The text holds a control or format character (Unicode Cc or Cf) other than a line break or tab.",
  },
  MOMENT_TOO_MANY_IMAGES: {
    status: 400,
    message: `A Moment shows at most ${MOMENT_IMAGES_MAX} images.`,
    data: z.object({
      limit: z.number().int().describe("The most images it may show."),
      count: z.number().int().describe("The images sent."),
    }),
  },
  MOMENT_IMAGES_AND_VIDEO: {
    status: 400,
    message:
      "A Moment has images or a video, not both. Send images: [] with a video, or video: null with images.",
  },
  MOMENT_IMAGE_INVALID: {
    status: 400,
    message: "Images must be Media paths (/images/<key>).",
    data: z.object({
      images: z.array(z.string()).describe("The refused entries."),
    }),
  },
  MOMENT_IMAGE_NOT_FOUND: {
    status: 400,
    message: "No Media has the image.",
    data: z.object({
      images: z
        .array(z.string())
        .describe("The Media paths, /images/<key>, that no Media has."),
    }),
  },
  MOMENT_VIDEO_INVALID: {
    status: 400,
    message:
      "The video must be a Bilibili or YouTube video link, or a Direct Video at https addresses.",
    data: z.object({
      detail: z
        .enum(["UNSUPPORTED_LINK", "SHORT_LINK", "NOT_HTTPS"])
        .describe(
          "UNSUPPORTED_LINK: url names no Bilibili or YouTube video. SHORT_LINK: url is a b23.tv short link. NOT_HTTPS: a Direct Video's src, poster or page is not an https address without a user name or password.",
        ),
      addresses: z.array(z.string()).describe("The refused addresses."),
    }),
  },
} as const;

const editConflictErrors = {
  EDIT_CONFLICT: {
    status: 409,
    message: "The Moment was saved since the stated saveToken was read.",
    data: MomentEditConflictDataSchema,
  },
} as const;

function quoted(list: Array<string>) {
  return list.map((item) => `"${item}"`).join(", ");
}

/** Throws the 400 for content a Moment cannot hold. */
function throwContentError(
  error: MomentContentError,
  // The operation's `errors`, which declare every one of `contentErrors`.
  errors: object,
): never {
  const raise = errors as Record<
    keyof typeof contentErrors,
    (options?: { message?: string; data?: unknown }) => Error
  >;
  switch (error.reason) {
    case "MOMENT_EMPTY":
    case "MOMENT_TEXT_INVALID":
    case "MOMENT_IMAGES_AND_VIDEO":
      throw raise[error.reason]();
    case "MOMENT_TEXT_TOO_LONG":
      throw raise.MOMENT_TEXT_TOO_LONG({
        message: `The text holds ${error.length} characters (Unicode code points), over the ${error.limit} a Moment holds. Nothing was written.`,
        data: { limit: error.limit, length: error.length },
      });
    case "MOMENT_TOO_MANY_IMAGES":
      throw raise.MOMENT_TOO_MANY_IMAGES({
        message: `${error.count} images were sent; a Moment shows at most ${error.limit}. Nothing was written.`,
        data: { limit: error.limit, count: error.count },
      });
    case "MOMENT_IMAGE_INVALID":
      throw raise.MOMENT_IMAGE_INVALID({
        message: `${error.images.length > 1 ? "Images" : "Image"} ${quoted(error.images)} must be a Media path (/images/<key>). Upload the image as Media first and use its path.`,
        data: { images: error.images },
      });
    case "MOMENT_IMAGE_NOT_FOUND":
      throw raise.MOMENT_IMAGE_NOT_FOUND({
        message: `No Media has ${error.images.length > 1 ? "the images" : "the image"} ${quoted(error.images)}. Upload it as Media first, or leave it out.`,
        data: { images: error.images },
      });
    case "MOMENT_VIDEO_INVALID": {
      const message = {
        UNSUPPORTED_LINK: `${quoted(error.addresses)} names no Bilibili or YouTube video. Give the video's page or player link, or a Direct Video as { src }.`,
        SHORT_LINK: `${quoted(error.addresses)} is a b23.tv short link, which the server does not follow. Open it and give the address it leads to.`,
        NOT_HTTPS: `A Direct Video's file, poster and page must be https addresses without a user name or password; ${quoted(error.addresses)} ${error.addresses.length > 1 ? "are" : "is"} not.`,
      }[error.detail];
      throw raise.MOMENT_VIDEO_INVALID({
        message: `${message} Nothing was written.`,
        data: { detail: error.detail, addresses: error.addresses },
      });
    }
    default:
      error satisfies never;
      throw new Error("Unknown Moment content error");
  }
}

const MOMENT_VIEW =
  "The Moment comes back as readers see it, each image with its address and size, together with its saveToken.";

const adminGet = adminProcedure
  .errors(momentNotFoundErrors)
  .route({
    method: "GET",
    path: "/admin/moments/{id}",
    summary: "Get a moment to edit",
    description: `Returns the Moment with its saveToken, or answers 404 MOMENT_NOT_FOUND. ${MOMENT_VIEW} saveToken identifies this read: state it when saving. Images are written back as /images/{key}.`,
    tags: ["Admin Moments"],
  })
  .input(MomentIdInputSchema)
  .output(AdminMomentSchema)
  .handler(async ({ context, input, errors }) => {
    const moment = await MomentService.findMomentById(context, input.id);
    if (!moment) throw errors.MOMENT_NOT_FOUND();
    return moment;
  });

const create = adminProcedure
  .errors(contentErrors)
  .route({
    method: "POST",
    path: "/admin/moments",
    summary: "Post a moment",
    description: `Posts a Moment, public at once: text, with either up to ${MOMENT_IMAGES_MAX} images or one video, never both and never nothing (400 MOMENT_EMPTY). ${MOMENT_VIEW} postedAt is now, and edits never change it. A refused Moment writes nothing.`,
    tags: ["Admin Moments"],
  })
  .input(CreateMomentInputSchema)
  .output(AdminMomentSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MomentService.createMoment(context, input), {
      MOMENT_EMPTY: (error) => throwContentError(error, errors),
      MOMENT_TEXT_TOO_LONG: (error) => throwContentError(error, errors),
      MOMENT_TEXT_INVALID: (error) => throwContentError(error, errors),
      MOMENT_TOO_MANY_IMAGES: (error) => throwContentError(error, errors),
      MOMENT_IMAGES_AND_VIDEO: (error) => throwContentError(error, errors),
      MOMENT_IMAGE_INVALID: (error) => throwContentError(error, errors),
      MOMENT_IMAGE_NOT_FOUND: (error) => throwContentError(error, errors),
      MOMENT_VIDEO_INVALID: (error) => throwContentError(error, errors),
    }),
  );

const update = adminProcedure
  .errors({
    ...momentNotFoundErrors,
    ...contentErrors,
    ...editConflictErrors,
  })
  .route({
    method: "PATCH",
    path: "/admin/moments/{id}",
    summary: "Edit a moment",
    description: `Writes only the fields in data, at least one (an empty data answers 400), public at once; the Moment keeps its postedAt and no history of it is kept. The result is held to the rules a new Moment is: images or a video, not both, and not nothing. ${MOMENT_VIEW} A save that leaves every stated field as it is writes nothing and answers the current saveToken. Media the Moment shows cannot be deleted, so a Moment saved at the same time as its image is deleted ends with one of them refused. With saveToken, the write happens only if the Moment was not saved since that token was read; otherwise it answers 409 EDIT_CONFLICT, writes nothing, and data.saveToken is the current token.`,
    tags: ["Admin Moments"],
  })
  .input(UpdateMomentInputSchema)
  .output(AdminMomentSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MomentService.updateMoment(context, input), {
      MOMENT_NOT_FOUND: () => {
        throw errors.MOMENT_NOT_FOUND();
      },
      EDIT_CONFLICT: ({ saveToken }) => {
        throw errors.EDIT_CONFLICT({ data: { saveToken } });
      },
      MOMENT_EMPTY: (error) => throwContentError(error, errors),
      MOMENT_TEXT_TOO_LONG: (error) => throwContentError(error, errors),
      MOMENT_TEXT_INVALID: (error) => throwContentError(error, errors),
      MOMENT_TOO_MANY_IMAGES: (error) => throwContentError(error, errors),
      MOMENT_IMAGES_AND_VIDEO: (error) => throwContentError(error, errors),
      MOMENT_IMAGE_INVALID: (error) => throwContentError(error, errors),
      MOMENT_IMAGE_NOT_FOUND: (error) => throwContentError(error, errors),
      MOMENT_VIDEO_INVALID: (error) => throwContentError(error, errors),
    }),
  );

const remove = adminProcedure
  .errors(momentNotFoundErrors)
  .route({
    method: "DELETE",
    path: "/admin/moments/{id}",
    summary: "Delete a moment",
    description:
      "Deletes the Moment at once; its images stay in the media library, no longer used by it. Cannot be undone. A Moment that does not exist answers 404 MOMENT_NOT_FOUND.",
    tags: ["Admin Moments"],
  })
  .input(MomentIdInputSchema)
  .output(DeleteMomentResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(MomentService.deleteMoment(context, input), {
      MOMENT_NOT_FOUND: () => {
        throw errors.MOMENT_NOT_FOUND();
      },
    }),
  );

export default {
  get: adminGet,
  create,
  update,
  remove,
};
