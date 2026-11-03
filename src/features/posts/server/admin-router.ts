import { z } from "zod";
import {
  AdminFindPostByIdInputSchema,
  AdminPostListPageSchema,
  CreatePostInputSchema,
  CreatePostResultSchema,
  DeletePostInputSchema,
  DeletePostResultSchema,
  DeletePostRevisionsResultSchema,
  DirectVideoInputSchema,
  DirectVideoLookupSchema,
  DiscardPostChangesInputSchema,
  GenerateSlugInputSchema,
  GenerateSlugResultSchema,
  GetPostsInputSchema,
  PinPostInputSchema,
  AdminPostSchema,
  EditConflictDataSchema,
  PostWriteResultSchema,
  PublishPostInputSchema,
  RestorePostRevisionResultSchema,
  UnpinPostInputSchema,
  UnpublishPostInputSchema,
  UpdatedPostSchema,
  UpdatePostInputSchema,
  VideoMetaInputSchema,
  VideoMetaSchema,
} from "@/features/posts/schema/posts.schema";
import {
  DeletePostRevisionsInputSchema,
  GetPostRevisionInputSchema,
  ListPostRevisionsInputSchema,
  PostRevisionListItemSchema,
  PostRevisionSchema,
  RestorePostRevisionInputSchema,
} from "@/features/posts/schema/post-revisions.schema";
import * as DirectVideoService from "@/features/posts/services/direct-video.service";
import * as PostMarkdownService from "@/features/posts/services/post-markdown.service";
import * as PostRevisionService from "@/features/posts/services/post-revisions.service";
import * as PostService from "@/features/posts/services/posts.service";
import * as VideoMetaService from "@/features/posts/services/video-meta.service";
import {
  CONTENT_SIZE_RULES,
  HIGHLIGHT_BUDGET_CHARS,
  POST_CONTENT_JSON_LIMIT_BYTES,
  PUBLIC_SNAPSHOT_LIMIT_BYTES,
} from "@/features/posts/utils/post-content-size";
import { videoSourceOf } from "@/features/posts/utils/video-source";
import { getPostPublisher } from "@/lib/do/post-publisher-binding";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

// Every error a post operation can answer. Each operation declares only the
// ones its service or handler really returns, picked from here.
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
  SLUG_TAKEN: {
    status: 409,
    message:
      "Another post already uses this slug, or a variant of it differing only in case or Unicode compatibility form (NFKC), as its slug or live page.",
  },
  MEDIA_NOT_FOUND: { status: 404, message: "Media not found." },
  CATEGORY_NOT_FOUND: { status: 404, message: "Category not found." },
  CONTENT_FORMAT_AMBIGUOUS: {
    status: 400,
    message: "Send contentJson or contentMarkdown, not both.",
  },
  CONTENT_IMAGE_NOT_FOUND: {
    status: 400,
    message:
      "The body shows an image by a Media path (/images/<key>, alone or on the blog's own address) that no Media has.",
    data: z.object({
      images: z
        .array(z.string())
        .describe("The image addresses whose Media does not exist."),
    }),
  },
  MARKDOWN_IMAGE_INVALID: {
    status: 400,
    message:
      "Markdown images must be http(s) addresses or Media paths (/images/<key>).",
    data: z.object({
      images: z.array(z.string()).describe("The refused image addresses."),
    }),
  },
  CONTENT_JSON_INVALID: {
    status: 400,
    message:
      "contentJson holds node or mark types the editor does not know, attributes it does not give them, or images that are not http(s) addresses or Media paths (/images/<key>).",
    data: z.object({
      nodeTypes: z
        .array(z.string())
        .describe("The node types the editor does not know."),
      markTypes: z
        .array(z.string())
        .describe("The mark types the editor does not know."),
      attributes: z
        .array(z.string())
        .describe(
          "The attributes the editor does not give their node or mark type, as type.attribute, such as link.onclick.",
        ),
      images: z.array(z.string()).describe("The refused image addresses."),
    }),
  },
  CONTENT_LINK_INVALID: {
    status: 400,
    message:
      "Links must be http(s), mailto or tel addresses, site paths or #fragments, and a Direct Video's addresses must be https.",
    data: z.object({
      links: z
        .array(z.string())
        .describe(
          "The refused addresses: links such as javascript: or data:, and Direct Video file, poster or page addresses (src, cover, pageUrl) that are not https.",
        ),
    }),
  },
  POST_CONTENT_TOO_LARGE: {
    status: 413,
    message: `The post body is larger than the ${POST_CONTENT_JSON_LIMIT_BYTES} bytes a post stores.`,
    data: z.object({
      field: z
        .enum(["contentJson", "publicSnapshot"])
        .describe(
          "What is too large: contentJson, the body as stored (after any Markdown conversion), or publicSnapshot, the Public Content Snapshot, which also holds the highlighted code HTML.",
        ),
      limit: z.number().int().describe("The most bytes it may take."),
      size: z.number().int().describe("The bytes it would take."),
    }),
  },
} as const;

const contentSizeErrors = {
  POST_CONTENT_TOO_LARGE: postErrors.POST_CONTENT_TOO_LARGE,
} as const;

/** Throws the 413 for a body or snapshot over its stored limit. */
function throwContentTooLarge(
  error: {
    field: "contentJson" | "publicSnapshot";
    limit: number;
    size: number;
  },
  errors: {
    POST_CONTENT_TOO_LARGE: (options: {
      message: string;
      data: {
        field: "contentJson" | "publicSnapshot";
        limit: number;
        size: number;
      };
    }) => Error;
  },
): never {
  const what =
    error.field === "contentJson"
      ? "The post body"
      : "The Public Content Snapshot (the body with its code highlighted)";
  throw errors.POST_CONTENT_TOO_LARGE({
    message: `${what} takes ${error.size} bytes stored, over the ${error.limit} bytes a post keeps. Shorten the post or split it into several posts. Nothing was written.`,
    data: { field: error.field, limit: error.limit, size: error.size },
  });
}

const markdownContentErrors = {
  CONTENT_FORMAT_AMBIGUOUS: postErrors.CONTENT_FORMAT_AMBIGUOUS,
  MARKDOWN_IMAGE_INVALID: postErrors.MARKDOWN_IMAGE_INVALID,
  CONTENT_JSON_INVALID: postErrors.CONTENT_JSON_INVALID,
  CONTENT_LINK_INVALID: postErrors.CONTENT_LINK_INVALID,
} as const;

const contentImageErrors = {
  CONTENT_IMAGE_NOT_FOUND: postErrors.CONTENT_IMAGE_NOT_FOUND,
} as const;

function throwContentImageNotFound(
  images: Array<string>,
  errors: {
    CONTENT_IMAGE_NOT_FOUND: (options: {
      message: string;
      data: { images: Array<string> };
    }) => Error;
  },
): never {
  const list = images.map((src) => `"${src}"`).join(", ");
  throw errors.CONTENT_IMAGE_NOT_FOUND({
    message: `No Media has ${images.length > 1 ? "the images" : "the image"} ${list}. Upload it as Media first, or remove it from the body.`,
    data: { images },
  });
}

const postNotFoundErrors = {
  POST_NOT_FOUND: postErrors.POST_NOT_FOUND,
} as const;

type MarkdownContentError =
  | { reason: "CONTENT_FORMAT_AMBIGUOUS" }
  | { reason: "MARKDOWN_IMAGE_INVALID"; images: Array<string> }
  | {
      reason: "CONTENT_JSON_INVALID";
      nodeTypes: Array<string>;
      markTypes: Array<string>;
      attributes: Array<string>;
      images: Array<string>;
    }
  | { reason: "CONTENT_LINK_INVALID"; links: Array<string> };

function throwMarkdownContentError(
  error: MarkdownContentError,
  errors: {
    CONTENT_FORMAT_AMBIGUOUS: () => Error;
    MARKDOWN_IMAGE_INVALID: (options: {
      message: string;
      data: { images: Array<string> };
    }) => Error;
    CONTENT_JSON_INVALID: (options: {
      message: string;
      data: {
        nodeTypes: Array<string>;
        markTypes: Array<string>;
        attributes: Array<string>;
        images: Array<string>;
      };
    }) => Error;
    CONTENT_LINK_INVALID: (options: {
      message: string;
      data: { links: Array<string> };
    }) => Error;
  },
): never {
  switch (error.reason) {
    case "CONTENT_FORMAT_AMBIGUOUS":
      throw errors.CONTENT_FORMAT_AMBIGUOUS();
    case "MARKDOWN_IMAGE_INVALID": {
      const list = error.images.map((src) => `"${src}"`).join(", ");
      throw errors.MARKDOWN_IMAGE_INVALID({
        message: `${error.images.length > 1 ? "Images" : "Image"} ${list} must be an http(s) address or a Media path (/images/<key>). Upload local images as Media and use their path.`,
        data: { images: error.images },
      });
    }
    case "CONTENT_JSON_INVALID": {
      const { nodeTypes, markTypes, attributes, images } = error;
      const quoted = (list: Array<string>) =>
        list.map((item) => `"${item}"`).join(", ");
      const problems = [
        nodeTypes.length > 0 && `unknown node types ${quoted(nodeTypes)}`,
        markTypes.length > 0 && `unknown mark types ${quoted(markTypes)}`,
        attributes.length > 0 &&
          `unknown attributes ${quoted(attributes)} (type.attribute)`,
        images.length > 0 &&
          `images ${quoted(images)}, which must be http(s) addresses or Media paths (/images/<key>)`,
      ].filter(Boolean);
      throw errors.CONTENT_JSON_INVALID({
        message: `contentJson is refused: ${problems.join("; ")}.`,
        data: { nodeTypes, markTypes, attributes, images },
      });
    }
    case "CONTENT_LINK_INVALID": {
      const list = error.links.map((href) => `"${href}"`).join(", ");
      throw errors.CONTENT_LINK_INVALID({
        message: `${error.links.length > 1 ? "Addresses" : "Address"} ${list} cannot be shown on a post. A link must be an http(s), mailto or tel address, a site path or a #fragment, not javascript: or data:, and a Direct Video's file, poster and page (src, cover, pageUrl) must be https addresses without a user name or password.`,
        data: { links: error.links },
      });
    }
    default:
      error satisfies never;
      throw new Error("Unknown Markdown content error");
  }
}

const editConflictErrors = {
  EDIT_CONFLICT: {
    status: 409,
    message: "The post was saved since the stated saveToken was read.",
    data: EditConflictDataSchema,
  },
} as const;

const discardChangesErrors = {
  POST_NOT_PUBLISHED: {
    status: 409,
    message: "The post is not published, so there is nothing to discard to.",
  },
  NO_UNPUBLISHED_CHANGES: {
    status: 409,
    message: "The draft already matches the published version.",
  },
} as const;

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts",
    summary: "List posts for admin",
    tags: ["Admin Posts"],
  })
  .input(GetPostsInputSchema)
  .output(AdminPostListPageSchema)
  .handler(async ({ context, input }) => {
    const page = await PostService.listAdminPostsPage(context, input);
    return {
      ...page,
      items: await Promise.all(
        page.items.map((item) =>
          PostMarkdownService.inContentFormat(item, input.contentFormat),
        ),
      ),
    };
  });

const adminGet = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "GET",
    path: "/admin/posts/{id}",
    summary: "Get a post by id",
    description:
      "Returns the editable Post, or answers 404 POST_NOT_FOUND when there is none. hasUnpublishedChanges tells whether the draft differs from the published version. The published body, from the Public Content Snapshot, comes next to the draft: publicSnapshotContentJson, or publicSnapshotContentMarkdown with contentFormat=markdown, so one read compares the draft with what is published, whatever Post Revisions were deleted. saveToken identifies this read: state it when saving or publishing.",
    tags: ["Admin Posts"],
  })
  .input(AdminFindPostByIdInputSchema)
  .output(AdminPostSchema)
  .handler(async ({ context, input, errors }) => {
    const post = await PostService.findPostById(context, input);
    if (!post) throw errors.POST_NOT_FOUND();
    return PostMarkdownService.adminPostInContentFormat(
      post,
      input.contentFormat,
    );
  });

const generateSlug = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/slug",
    summary: "Generate a post slug",
    description:
      "Makes a slug from a title that no other post uses, without saving anything. Pass excludeId to leave out the post being edited.",
    tags: ["Admin Posts"],
  })
  .input(GenerateSlugInputSchema)
  .output(GenerateSlugResultSchema)
  .handler(({ context, input }) => PostService.generateSlug(context, input));

const videoMeta = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/video-meta",
    summary: "Look up an embedded video's title, cover and length",
    description:
      "Asks the video's provider once, when the editor embeds it. Returns null when the provider has nothing to give or cannot be reached.",
    tags: ["Admin Posts"],
  })
  .input(VideoMetaInputSchema)
  .output(VideoMetaSchema)
  .handler(({ input }) => {
    const source = videoSourceOf(input);
    return source ? VideoMetaService.fetchVideoMeta(source) : null;
  });

const directVideo = adminProcedure
  .route({
    method: "GET",
    path: "/admin/posts/direct-video",
    summary: "Look up the address of a Direct Video",
    description:
      "Asks the address once, when the editor embeds a Direct Video: a video file is returned as is, and from a web page its title, cover and the video file it names are read, the file only once a request for it answers a video file. Only https addresses are asked, and a redirect only to another one. Writes in Markdown over the API never call it; their <video> lines are kept as written.",
    tags: ["Admin Posts"],
  })
  .input(DirectVideoInputSchema)
  .output(DirectVideoLookupSchema)
  .handler(({ input }) => DirectVideoService.resolveDirectVideo(input.url));

const create = adminProcedure
  .errors({
    ...markdownContentErrors,
    ...contentImageErrors,
    ...contentSizeErrors,
  })
  .route({
    method: "POST",
    path: "/admin/posts",
    summary: "Create a draft post",
    description: `With data, creates a new draft post carrying that content. An image shown by a Media path (/images/<key>, alone or on the blog's own address, as https://<blog>/images/<key>) must be existing Media: otherwise it answers 400 CONTENT_IMAGE_NOT_FOUND naming it and creates nothing. ${CONTENT_SIZE_RULES} Without data, returns an existing empty draft post when one exists, otherwise creates one. Returns the post's id and saveToken, never the body, so it takes no contentFormat; read the post to get it in either format.`,
    tags: ["Admin Posts"],
  })
  .input(CreatePostInputSchema)
  .output(CreatePostResultSchema)
  .handler(async ({ context, input, errors }) => {
    if (!input?.data) return PostService.createEmptyPost(context);
    const data = await PostMarkdownService.resolveMarkdownContent(
      context,
      input.data,
    );
    if (data.error) throwMarkdownContentError(data.error, errors);
    return unwrapResult(PostService.createDraft(context, data.data), {
      CONTENT_IMAGE_NOT_FOUND: ({ images }) =>
        throwContentImageNotFound(images, errors),
      POST_CONTENT_TOO_LARGE: (error) => throwContentTooLarge(error, errors),
    });
  });

const update = adminProcedure
  .errors({
    ...postNotFoundErrors,
    ...markdownContentErrors,
    ...contentImageErrors,
    ...contentSizeErrors,
    MEDIA_NOT_FOUND: postErrors.MEDIA_NOT_FOUND,
    CATEGORY_NOT_FOUND: postErrors.CATEGORY_NOT_FOUND,
    SLUG_TAKEN: postErrors.SLUG_TAKEN,
    ...editConflictErrors,
  })
  .route({
    method: "PATCH",
    path: "/admin/posts/{id}",
    summary: "Update a post",
    description: `Writes only the fields in data, at least one (an empty data answers 400), and returns the updated Post with its new saveToken. The Post's Tags are not among them: set them with tags.admin.setPostTags (PUT /admin/posts/{postId}/tags), which takes saveToken the same way. A save that leaves every stated field as it is writes nothing and answers the current saveToken. ${CONTENT_SIZE_RULES} The body comes back as contentJson, or as contentMarkdown instead when contentFormat=markdown (a top-level field next to data); it follows contentFormat, not the format the body was written in. An image the body shows by a Media path (/images/<key>, alone or on the blog's own address, as https://<blog>/images/<key>) must be existing Media, unless the draft already showed it: otherwise it answers 400 CONTENT_IMAGE_NOT_FOUND naming it and writes nothing. A cover (coverMediaId) that is not existing Media answers 404 MEDIA_NOT_FOUND. Media the draft uses cannot be deleted, so a body saved at the same time as its image is deleted ends with one of them refused. With saveToken, the write happens only if the post was not saved since that token was read; otherwise it answers 409 EDIT_CONFLICT, writes nothing, and data.saveToken is the current token.`,
    tags: ["Admin Posts"],
  })
  .input(UpdatePostInputSchema)
  .output(UpdatedPostSchema)
  .handler(async ({ context, input, errors }) => {
    const data = await PostMarkdownService.resolveMarkdownContent(
      context,
      input.data,
      input.id,
    );
    if (data.error) throwMarkdownContentError(data.error, errors);
    const { contentFormat, ...write } = input;
    const post = await unwrapResult(
      PostService.updatePost(context, { ...write, data: data.data }),
      {
        POST_NOT_FOUND: () => {
          throw errors.POST_NOT_FOUND();
        },
        EDIT_CONFLICT: ({ saveToken }) => {
          throw errors.EDIT_CONFLICT({ data: { saveToken } });
        },
        MEDIA_NOT_FOUND: () => {
          throw errors.MEDIA_NOT_FOUND();
        },
        CONTENT_IMAGE_NOT_FOUND: ({ images }) =>
          throwContentImageNotFound(images, errors),
        CATEGORY_NOT_FOUND: () => {
          throw errors.CATEGORY_NOT_FOUND();
        },
        SLUG_TAKEN: () => {
          throw errors.SLUG_TAKEN();
        },
        POST_CONTENT_TOO_LARGE: (error) => throwContentTooLarge(error, errors),
      },
    );
    return PostMarkdownService.inContentFormat(post, contentFormat);
  });

const remove = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "DELETE",
    path: "/admin/posts/{id}",
    summary: "Delete a post",
    tags: ["Admin Posts"],
  })
  .input(DeletePostInputSchema)
  .output(DeletePostResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.deletePost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const publishPost = adminProcedure
  .errors({
    ...postNotFoundErrors,
    PUBLISHED_AT_IN_FUTURE: postErrors.PUBLISHED_AT_IN_FUTURE,
    PUBLIC_SLUG_TAKEN: postErrors.PUBLIC_SLUG_TAKEN,
    ...contentSizeErrors,
    ...editConflictErrors,
  })
  .route({
    method: "POST",
    path: "/admin/posts/{id}/publish",
    summary: "Publish a post",
    description: `Publishes the post and generates or updates its Public Content Snapshot. Code blocks are highlighted on the server and stored in the snapshot, in order, up to ${HIGHLIGHT_BUDGET_CHARS} characters of new code per publish; a block past that is stored unhighlighted, as plain text. Answers 409 PUBLIC_SLUG_TAKEN when another post's live page uses the slug, ignoring case and Unicode compatibility forms (NFKC), and 400 PUBLISHED_AT_IN_FUTURE while the publication date is later than the server's current time, to the second. Answers 413 POST_CONTENT_TOO_LARGE, writing nothing, when the serialized Public Content Snapshot (the body with its code highlighted, which is larger than the draft) takes more than ${PUBLIC_SNAPSHOT_LIMIT_BYTES} bytes; shorten the post. When the snapshot is over the limit even before its code is highlighted, it answers at once and data.size counts it unhighlighted. With saveToken, only the draft that token was read from is published; if the post was saved since, it answers 409 EDIT_CONFLICT, publishes nothing, and data.saveToken is the current token.`,
    tags: ["Admin Posts"],
  })
  .input(PublishPostInputSchema)
  .output(PostWriteResultSchema)
  .handler(async ({ input, errors }) => {
    const result = await (
      await getPostPublisher(input.id)
    ).publish(input.id, input.saveToken);
    return unwrapResult(result, {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
      EDIT_CONFLICT: ({ saveToken }) => {
        throw errors.EDIT_CONFLICT({ data: { saveToken } });
      },
      PUBLISHED_AT_IN_FUTURE: () => {
        throw errors.PUBLISHED_AT_IN_FUTURE();
      },
      PUBLIC_SLUG_TAKEN: () => {
        throw errors.PUBLIC_SLUG_TAKEN();
      },
      POST_CONTENT_TOO_LARGE: (error) => throwContentTooLarge(error, errors),
    });
  });

const unpublishPost = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{id}/unpublish",
    summary: "Unpublish a post",
    description:
      "Discards the Public Content Snapshot, so the post becomes a draft post and leaves the public site. A post that is already a draft is left as it is: it answers 200 with its current saveToken, unchanged.",
    tags: ["Admin Posts"],
  })
  .input(UnpublishPostInputSchema)
  .output(PostWriteResultSchema)
  .handler(async ({ input, errors }) => {
    const result = await (await getPostPublisher(input.id)).unpublish(input.id);
    return unwrapResult(result, {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    });
  });

const discardChanges = adminProcedure
  .errors({
    ...postNotFoundErrors,
    ...discardChangesErrors,
    SLUG_TAKEN: postErrors.SLUG_TAKEN,
    ...editConflictErrors,
  })
  .route({
    method: "POST",
    path: "/admin/posts/{id}/discard-changes",
    summary: "Discard a post's unpublished changes",
    description:
      "Makes the draft of a published post that has unpublished changes (hasUnpublishedChanges) match the published version again: title, summary, slug, body, publication date, cover, category and tags, read from the published version itself, so it works whatever Post Revisions were deleted. The draft as it is now is first saved as a Post Revision (reason restore_backup), so the discarded changes can be restored from the revision list. The published page is not touched. Answers 409 POST_NOT_PUBLISHED for a draft post, 409 NO_UNPUBLISHED_CHANGES when the draft already matches, and 409 SLUG_TAKEN when another post's draft has taken the published slug meanwhile. With saveToken, only the draft that token was read from is discarded; if the post was saved since, it answers 409 EDIT_CONFLICT, writes nothing, and data.saveToken is the current token. Returns the post's new saveToken.",
    tags: ["Admin Posts"],
  })
  .input(DiscardPostChangesInputSchema)
  .output(PostWriteResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      PostRevisionService.discardUnpublishedChanges(context, input),
      {
        POST_NOT_FOUND: () => {
          throw errors.POST_NOT_FOUND();
        },
        POST_NOT_PUBLISHED: () => {
          throw errors.POST_NOT_PUBLISHED();
        },
        NO_UNPUBLISHED_CHANGES: () => {
          throw errors.NO_UNPUBLISHED_CHANGES();
        },
        SLUG_TAKEN: () => {
          throw errors.SLUG_TAKEN();
        },
        EDIT_CONFLICT: ({ saveToken }) => {
          throw errors.EDIT_CONFLICT({ data: { saveToken } });
        },
      },
    ),
  );

const pinPost = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{id}/pin",
    summary: "Pin a post",
    description:
      "Pins the post to the top of the homepage. Takes effect at once, without publishing: the public site reads the post's own pin, not the Public Content Snapshot, and its caches are purged. Pinning an already pinned post keeps its place. A draft can be pinned too; the pin shows once it is published. The pin is not part of the draft, so the post's saveToken stays as it was.",
    tags: ["Admin Posts"],
  })
  .input(PinPostInputSchema)
  .output(PostWriteResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.pinPost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const unpinPost = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "POST",
    path: "/admin/posts/{id}/unpin",
    summary: "Unpin a post",
    description:
      "Removes the post's pin. Takes effect at once, without publishing, and purges the public caches. The pin is not part of the draft, so the post's saveToken stays as it was.",
    tags: ["Admin Posts"],
  })
  .input(UnpinPostInputSchema)
  .output(PostWriteResultSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(PostService.unpinPost(context, input), {
      POST_NOT_FOUND: () => {
        throw errors.POST_NOT_FOUND();
      },
    }),
  );

const listRevisions = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "GET",
    path: "/admin/posts/{postId}/revisions",
    summary: "List post revisions",
    description:
      "A post that does not exist answers 404 POST_NOT_FOUND; a post without revisions answers an empty list.",
    tags: ["Admin Posts"],
  })
  .input(ListPostRevisionsInputSchema)
  .output(z.array(PostRevisionListItemSchema))
  .handler(async ({ context, input, errors }) => {
    if (!(await PostService.postExists(context, input.postId))) {
      throw errors.POST_NOT_FOUND();
    }
    return PostRevisionService.listPostRevisions(context, input);
  });

const getRevision = adminProcedure
  .errors({ POST_REVISION_NOT_FOUND: postErrors.POST_REVISION_NOT_FOUND })
  .route({
    method: "GET",
    path: "/admin/posts/{postId}/revisions/{revisionId}",
    summary: "Get a post revision",
    description:
      "Answers 404 POST_REVISION_NOT_FOUND when the post has no such revision. The snapshot's body comes back as snapshotJson.contentJson, or as snapshotJson.contentMarkdown instead when contentFormat=markdown.",
    tags: ["Admin Posts"],
  })
  .input(GetPostRevisionInputSchema)
  .output(PostRevisionSchema)
  .handler(async ({ context, input, errors }) => {
    const { contentFormat, ...find } = input;
    const revision = await PostRevisionService.findPostRevisionById(
      context,
      find,
    );
    if (!revision) throw errors.POST_REVISION_NOT_FOUND();
    return {
      ...revision,
      snapshotJson: await PostMarkdownService.inContentFormat(
        revision.snapshotJson,
        contentFormat,
      ),
    };
  });

const restoreRevision = adminProcedure
  .errors({
    ...postNotFoundErrors,
    POST_REVISION_NOT_FOUND: postErrors.POST_REVISION_NOT_FOUND,
    POST_REVISION_INVALID_SNAPSHOT: postErrors.POST_REVISION_INVALID_SNAPSHOT,
    SLUG_TAKEN: postErrors.SLUG_TAKEN,
    ...editConflictErrors,
  })
  .route({
    method: "POST",
    path: "/admin/posts/{postId}/revisions/{revisionId}/restore",
    summary: "Restore a post revision",
    description:
      "Writes the revision back into the draft, after saving the draft as it is now as a Post Revision. post.saveToken is the post's token after the restore. Answers 409 SLUG_TAKEN, writing nothing, when another post now uses the revision's slug. With saveToken, the restore happens only if the post was not saved since that token was read; otherwise it answers 409 EDIT_CONFLICT, writes nothing, and data.saveToken is the current token. Without saveToken it restores over whatever the draft is when the restore starts, and answers 409 EDIT_CONFLICT in the same way if a save lands while it runs, so no save is overwritten without being kept in the revision of the draft.",
    tags: ["Admin Posts"],
  })
  .input(RestorePostRevisionInputSchema)
  .output(RestorePostRevisionResultSchema)
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
      SLUG_TAKEN: () => {
        throw errors.SLUG_TAKEN();
      },
      EDIT_CONFLICT: ({ saveToken }) => {
        throw errors.EDIT_CONFLICT({ data: { saveToken } });
      },
    }),
  );

const deleteRevisions = adminProcedure
  .errors(postNotFoundErrors)
  .route({
    method: "DELETE",
    path: "/admin/posts/{postId}/revisions",
    summary: "Delete post revisions",
    description:
      "Permanently deletes the listed Post Revisions of the post; ids that are not its revisions are skipped, and deletedIds lists what was deleted. A post that does not exist answers 404 POST_NOT_FOUND. Revisions are history, not the draft: deleting them leaves the draft, its saveToken and the published page as they are, so it takes no saveToken. It cannot be undone. A restore_backup revision is the only copy of a draft that a restore or a discard replaced, so deleting it loses those changes for good. Media used only by deleted revisions is no longer in use and can then be deleted. Publishing, unpublishing and discard-changes do not need any revision.",
    tags: ["Admin Posts"],
  })
  .input(DeletePostRevisionsInputSchema)
  .output(DeletePostRevisionsResultSchema)
  .handler(async ({ context, input, errors }) => {
    if (!(await PostService.postExists(context, input.postId))) {
      throw errors.POST_NOT_FOUND();
    }
    return unwrapResult(
      PostRevisionService.deletePostRevisions(context, input),
      {},
    );
  });

export default {
  list: adminList,
  get: adminGet,
  generateSlug,
  videoMeta,
  directVideo,
  create,
  update,
  remove,
  publish: publishPost,
  unpublish: unpublishPost,
  discardChanges,
  pin: pinPost,
  unpin: unpinPost,
  revisions: {
    list: listRevisions,
    get: getRevision,
    restore: restoreRevision,
    remove: deleteRevisions,
  },
};
