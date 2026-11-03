import type { JSONContent } from "@tiptap/core";
import * as PostRepo from "@/features/posts/data/posts.data";
import { NullableJsonContentSchema } from "@/features/posts/schema/json-content.schema";
import type { PostContentFormat } from "@/features/posts/schema/posts.schema";
import * as VideoMetaService from "@/features/posts/services/video-meta.service";
import { inspectPostContent } from "@/features/posts/utils/post-content-rules";
import { refusedLinks } from "@/features/posts/utils/refused-links";
import type { VideoMeta } from "@/features/posts/utils/video-source";
import {
  directVideoOf,
  videoMetaOf,
  videoSourceOf,
} from "@/features/posts/utils/video-source";
import { err, ok } from "@/lib/errors";

/*
 * The HTTP API's Markdown body (ADR 0032): reads answer `contentMarkdown` in
 * place of `contentJson` when asked, and writes turn `contentMarkdown` into
 * `contentJson` before the usual write path.
 */

/**
 * The Markdown parser and serializer, loaded only by requests that ask for
 * Markdown, so JSON reads and writes, the Admin editor's among them, do not
 * load them.
 */
function loadPostMarkdown() {
  return import("@/features/posts/utils/post-markdown");
}

function walk(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

function videoKey(attrs: Record<string, unknown> | undefined) {
  const source = videoSourceOf(attrs);
  return source
    ? `${source.provider}:${source.videoId}:${source.page ?? 1}`
    : null;
}

function hasMeta(meta: VideoMeta) {
  return meta.title !== null || meta.cover !== null;
}

/**
 * What Markdown cannot say about the body it replaces: the title, cover and
 * length of each provider's video, the length of each Direct Video's file
 * and the size of each image.
 */
function knownDetails(previous: JSONContent | null) {
  const videos = new Map<string, VideoMeta>();
  const durations = new Map<string, number>();
  const images = new Map<string, { width: unknown; height: unknown }>();
  if (previous) {
    walk(previous, (node) => {
      if (node.type === "video") {
        const key = videoKey(node.attrs);
        const meta = videoMetaOf(node.attrs);
        if (key && hasMeta(meta)) videos.set(key, meta);
        const direct = directVideoOf(node.attrs);
        if (direct?.duration) durations.set(direct.src, direct.duration);
      } else if (node.type === "image" && node.attrs?.src) {
        const { width = null, height = null } = node.attrs;
        if (width !== null || height !== null) {
          images.set(String(node.attrs.src), { width, height });
        }
      }
    });
  }
  return { videos, durations, images };
}

/**
 * Gives every provider's video the title, cover and length it had in
 * `previous`, or else what its provider says. A failed lookup leaves them
 * empty. Nothing is looked up for a Direct Video: its title and poster are
 * what the Markdown says, and its length is the one its file had.
 */
async function withDetails(
  contentJson: JSONContent,
  previous: JSONContent | null,
): Promise<JSONContent> {
  const known = knownDetails(previous);
  const lookups = new Map<string, Promise<VideoMeta | null>>();
  walk(contentJson, (node) => {
    if (node.type !== "video") return;
    const key = videoKey(node.attrs);
    const source = videoSourceOf(node.attrs);
    if (!key || !source || known.videos.has(key) || lookups.has(key)) return;
    lookups.set(
      key,
      VideoMetaService.fetchVideoMeta(source).catch(() => null),
    );
  });
  for (const [key, lookup] of lookups) {
    const meta = await lookup;
    if (meta) known.videos.set(key, meta);
  }

  const fill = (node: JSONContent): JSONContent => {
    if (node.type === "video") {
      const key = videoKey(node.attrs);
      const meta = key ? known.videos.get(key) : undefined;
      if (meta) return { ...node, attrs: { ...node.attrs, ...meta } };
      const direct = directVideoOf(node.attrs);
      const duration = direct && known.durations.get(direct.src);
      return duration ? { ...node, attrs: { ...node.attrs, duration } } : node;
    }
    if (node.type === "image") {
      const size = known.images.get(String(node.attrs?.src));
      return size ? { ...node, attrs: { ...node.attrs, ...size } } : node;
    }
    return node.content ? { ...node, content: node.content.map(fill) } : node;
  };
  return fill(contentJson);
}

/**
 * `contentJson` as a JSON write hands it on: sent as JSON and parsed by the
 * input schema, which rebuilds every node with its keys in the schema's
 * order. Unpublished Changes hash the body as stored, so the same body must
 * be stored the same way whichever format it was written in.
 */
function asJsonWrite(contentJson: JSONContent) {
  return NullableJsonContentSchema.parse(
    JSON.parse(JSON.stringify(contentJson)),
  );
}

/**
 * What keeps `contentJson` from being stored: node or mark types the editor
 * does not know, attributes it does not give them, and images the server
 * cannot show, the rule Markdown images follow. A body that passes reads as
 * Markdown and writes back unchanged.
 */
async function invalidContentJson(contentJson: JSONContent) {
  const { nodeTypes, markTypes, attributes, imageSources } =
    inspectPostContent(contentJson);
  let images: Array<string> = [];
  if (imageSources.length > 0) {
    const { isPostMarkdownImage } = await loadPostMarkdown();
    images = [
      ...new Set(imageSources.filter((src) => !isPostMarkdownImage(src))),
    ];
  }
  return nodeTypes.length +
    markTypes.length +
    attributes.length +
    images.length >
    0
    ? ({
        reason: "CONTENT_JSON_INVALID",
        nodeTypes,
        markTypes,
        attributes,
        images,
      } as const)
    : null;
}

interface ContentFields {
  contentJson?: JSONContent | null;
  contentMarkdown?: string;
}

/**
 * `data` with its `contentMarkdown` turned into `contentJson`, ready for the
 * usual write path. `postId` names the Post being replaced, whose videos and
 * images keep what Markdown cannot carry. A body in either format with a
 * link the post could not show is refused.
 */
export async function resolveMarkdownContent<T extends ContentFields>(
  context: DbContext,
  data: T,
  postId?: number,
) {
  const { contentMarkdown, ...rest } = data;
  if (contentMarkdown === undefined) {
    if (!rest.contentJson) return ok(rest);
    const invalid = await invalidContentJson(rest.contentJson);
    if (invalid) return err(invalid);
    const links = refusedLinks(rest.contentJson);
    if (links.length > 0) return err({ reason: "CONTENT_LINK_INVALID", links });
    return ok(rest);
  }
  if (rest.contentJson !== undefined) {
    return err({ reason: "CONTENT_FORMAT_AMBIGUOUS" });
  }

  const { postContentFromMarkdown } = await loadPostMarkdown();
  const { contentJson, refusedImages } =
    postContentFromMarkdown(contentMarkdown);
  if (refusedImages.length > 0) {
    return err({ reason: "MARKDOWN_IMAGE_INVALID", images: refusedImages });
  }
  const links = refusedLinks(contentJson);
  if (links.length > 0) return err({ reason: "CONTENT_LINK_INVALID", links });

  const previous =
    postId === undefined
      ? null
      : ((await PostRepo.findPostById(context.db, postId))?.contentJson ??
        null);
  return ok({
    ...rest,
    contentJson: asJsonWrite(await withDetails(contentJson, previous)),
  });
}

/**
 * A Post read in `format`: Markdown answers `contentMarkdown` in place of
 * `contentJson`, and JSON, the default, leaves it as it is.
 */
export async function inContentFormat<
  T extends { contentJson?: JSONContent | null },
>(post: T, format: PostContentFormat) {
  if (format !== "markdown" || post.contentJson === undefined) return post;
  const { postContentToMarkdown } = await loadPostMarkdown();
  const { contentJson, ...rest } = post;
  return { ...rest, contentMarkdown: postContentToMarkdown(contentJson) };
}

/**
 * An admin read of a Post in `format`. Markdown also answers the published
 * body, from the Public Content Snapshot, as `publicSnapshotContentMarkdown`
 * in place of `publicSnapshotContentJson`, so a client compares the draft
 * with what is published in one format, whatever Post Revisions were deleted.
 */
export async function adminPostInContentFormat<
  T extends {
    contentJson?: JSONContent | null;
    publicSnapshotContentJson: JSONContent | null;
  },
>(post: T, format: PostContentFormat) {
  if (format !== "markdown") return post;
  const { postContentToMarkdown } = await loadPostMarkdown();
  const { contentJson, publicSnapshotContentJson, ...rest } = post;
  return {
    ...rest,
    contentMarkdown: postContentToMarkdown(contentJson ?? null),
    publicSnapshotContentMarkdown: postContentToMarkdown(
      publicSnapshotContentJson,
    ),
  };
}
