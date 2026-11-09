import * as MediaRepo from "@/features/media/data/media.data";
import * as Storage from "@/features/media/data/media.storage";
import type {
  GetMediaListInput,
  MediaInvalidDetail,
  UpdateMediaNameInput,
} from "@/features/media/media.schema";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { momentHeading } from "@/features/moments/utils/moment-heading";
import { getImageDimensions } from "@/features/media/utils/image-dimensions";
import { matchesDeclaredImageType } from "@/features/media/utils/image-signature";
import {
  cleanMediaName,
  getContentTypeFromKey,
  getOriginalImageUrl,
  getTransformSourceUrl,
  importedMediaName,
  imageExtensionOf,
  isSameImageType,
  parseImageTransform,
  isGifKey,
} from "@/features/media/utils/media.utils";
import { purgeWorkersCache } from "@/features/cache/workers-cache";
import { mediaPurgeTarget } from "@/features/cache/workers-cache-policy";
import * as PostMediaRepo from "@/features/posts/data/post-media.data";
import { CACHE_CONTROL } from "@/lib/constants";
import { fetchPublicUrl } from "@/lib/http/public-fetch";
import { err, ok } from "@/lib/errors";

function mediaInvalid(detail: MediaInvalidDetail) {
  return err({ reason: "MEDIA_INVALID" as const, detail });
}

export async function upload(
  context: DbContext & { executionCtx: ExecutionContext },
  input: { file: File },
) {
  const { file } = input;

  const buffer = await file.arrayBuffer();
  if (!matchesDeclaredImageType(buffer, file.type)) {
    return mediaInvalid("TYPE_MISMATCH");
  }
  const dimensions = getImageDimensions(buffer);
  const width = dimensions?.width;
  const height = dimensions?.height;

  const uploaded = await Storage.putToR2(context.env, file);

  try {
    const mediaRecord = await MediaRepo.insertMedia(context.db, {
      key: uploaded.key,
      url: uploaded.url,
      fileName:
        cleanMediaName(uploaded.fileName) ||
        `image.${imageExtensionOf(uploaded.mimeType)}`,
      mimeType: uploaded.mimeType,
      sizeInBytes: uploaded.sizeInBytes,
      width,
      height,
    });
    return ok(mediaRecord);
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "media db insert failed, rolling back r2 upload",
        key: uploaded.key,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    context.executionCtx.waitUntil(
      Storage.deleteFromR2(context.env, uploaded.key).catch((rollbackError) =>
        console.error(
          JSON.stringify({
            message: "r2 rollback delete failed",
            key: uploaded.key,
            error:
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError),
          }),
        ),
      ),
    );
    return err({ reason: "MEDIA_RECORD_CREATE_FAILED" });
  }
}

export async function deleteImage(
  context: DbContext & { executionCtx: ExecutionContext },
  key: string,
) {
  // The in-use check is part of the delete, so a Post saved meanwhile with
  // the image either makes it refuse or is refused itself.
  if (!(await MediaRepo.deleteMediaIfUnused(context.db, key))) {
    return (await MediaRepo.findMediaByKey(context.db, key))
      ? err({ reason: "MEDIA_IN_USE" })
      : err({ reason: "MEDIA_NOT_FOUND" });
  }
  context.executionCtx.waitUntil(
    Storage.deleteFromR2(context.env, key).catch((deleteError) =>
      console.error(
        JSON.stringify({
          message: "r2 delete failed",
          key,
          error:
            deleteError instanceof Error
              ? deleteError.message
              : String(deleteError),
        }),
      ),
    ),
  );

  return ok({ success: true });
}

export async function getMediaList(
  context: DbContext,
  data: GetMediaListInput,
) {
  return await MediaRepo.getMediaList(context.db, data);
}

export async function isMediaInUse(context: DbContext, key: string) {
  return await PostMediaRepo.isMediaInUse(context.db, key);
}

export async function mediaExists(context: DbContext, key: string) {
  return (await MediaRepo.findMediaByKey(context.db, key)) !== null;
}

export async function getLinkedPosts(context: DbContext, key: string) {
  return await PostMediaRepo.getPostsByMediaKey(context.db, key);
}

/** The Moments that show the image, titled as the Admin's other Moment lists title them. */
export async function getLinkedMoments(context: DbContext, key: string) {
  const moments = await MediaRepo.getMomentsByMediaKey(context.db, key);
  // A Moment with images has no video, so a blank text is an image Moment.
  return moments.map((moment) => ({
    id: moment.id,
    title: momentHeading({ text: moment.text, hasVideo: false }),
    postedAt: moment.postedAt,
  }));
}

export async function getLinkedMediaKeys(
  context: DbContext,
  keys: Array<string>,
) {
  return await PostMediaRepo.getLinkedMediaKeys(context.db, keys);
}

export async function getTotalMediaSize(context: DbContext) {
  return await MediaRepo.getTotalMediaSize(context.db);
}

export async function getMediaStats(context: DbContext) {
  return await MediaRepo.getMediaStats(context.db);
}

export async function updateMediaName(
  context: DbContext,
  data: UpdateMediaNameInput,
) {
  const renamed = await MediaRepo.updateMediaName(
    context.db,
    data.key,
    data.name,
  );
  if (!renamed) {
    return err({ reason: "MEDIA_NOT_FOUND" });
  }
  return ok(undefined);
}

/**
 * Puts a new file at an existing key. Posts keep naming the key, so their
 * drafts, Public Content Snapshots and Post Revisions are not written: the
 * cached copies of the key are purged instead, and every address of it,
 * public pages and editor alike, serves the new file from then on. The new
 * file must be the same image type: the key's extension and the content type
 * served at it would otherwise disagree.
 */
export async function replaceImage(
  context: DbContext & { executionCtx: ExecutionContext },
  input: { key: string; file: File },
) {
  const existing = await MediaRepo.findMediaByKey(context.db, input.key);
  if (!existing) {
    return err({ reason: "MEDIA_NOT_FOUND" });
  }

  const buffer = await input.file.arrayBuffer();
  if (!matchesDeclaredImageType(buffer, input.file.type)) {
    return mediaInvalid("TYPE_MISMATCH");
  }
  if (!isSameImageType(input.file.type, existing.mimeType)) {
    return mediaInvalid("TYPE_CHANGED");
  }
  const dimensions = getImageDimensions(buffer);
  await Storage.putToR2(context.env, input.file, input.key);
  // Only the Media record's own address changes, so a page that already
  // shows it (the media library) loads the new file instead of its copy.
  const url = `${getOriginalImageUrl(input.key)}?v=${Date.now()}`;
  const updated = await MediaRepo.updateMediaFile(context.db, input.key, {
    url,
    fileName: cleanMediaName(input.file.name) || existing.fileName,
    mimeType: input.file.type || existing.mimeType,
    sizeInBytes: input.file.size,
    width: dimensions?.width,
    height: dimensions?.height,
  });
  if (!updated) {
    return err({ reason: "MEDIA_NOT_FOUND" });
  }
  await purgeWorkersCache(context.executionCtx, mediaPurgeTarget(input.key));
  return ok(updated);
}

export async function deleteUnused(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  const keys = await MediaRepo.deleteUnusedMedia(context.db);
  for (const key of keys) {
    context.executionCtx.waitUntil(
      Storage.deleteFromR2(context.env, key).catch((deleteError) =>
        console.error(
          JSON.stringify({
            message: "r2 delete failed",
            key,
            error:
              deleteError instanceof Error
                ? deleteError.message
                : String(deleteError),
          }),
        ),
      ),
    );
  }
  return ok({ count: keys.length });
}

export async function importFromUrl(
  context: DbContext & { executionCtx: ExecutionContext },
  input: { url: string; name?: string },
) {
  const parsed = parseImageUrl(input.url);
  if (!parsed) {
    return err({ reason: "MEDIA_INVALID_URL" });
  }

  // The address, the DNS answers of its name and every redirect must all
  // be on the public internet.
  const fetched = await fetchPublicUrl(parsed, {
    signal: AbortSignal.timeout(15_000),
  });
  if (fetched.error) {
    return fetched.error.reason === "NOT_PUBLIC"
      ? err({ reason: "MEDIA_INVALID_URL" })
      : err({ reason: "MEDIA_IMPORT_FAILED" });
  }
  const response = fetched.data;

  if (!response.ok) {
    return err({ reason: "MEDIA_IMPORT_FAILED" });
  }

  const mime = (response.headers.get("content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.includes(mime)) {
    return mediaInvalid("TYPE_UNRECOGNIZED");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    return mediaInvalid("EMPTY");
  }
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return mediaInvalid("TOO_LARGE");
  }

  const file = new File(
    [buffer],
    importedMediaName(input.name ?? lastPathPart(parsed), mime),
    { type: mime },
  );
  return upload(context, { file });
}

function parseImageUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

/** The last part of the address path, decoded; empty when it has none or is not valid UTF-8 escapes. */
function lastPathPart(url: URL) {
  const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
  try {
    return decodeURIComponent(last);
  } catch {
    return "";
  }
}

// An SVG opened at its own address is a document on the site origin. Served
// as a sandboxed document with no script source it cannot run script, and
// nosniff keeps any image from being read as another type. As an <img>, an
// SVG never runs script anyway, so this changes nothing on the site's pages.
const IMAGE_SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
  "X-Content-Type-Options": "nosniff",
} as const;

function withImageHeaders(
  response: Response,
  cacheControl: Record<string, string>,
) {
  for (const [name, value] of Object.entries({
    ...cacheControl,
    ...IMAGE_SECURITY_HEADERS,
  })) {
    response.headers.set(name, value);
  }
  return response;
}

export async function handleImageRequest(
  env: Env,
  key: string,
  request: Request,
) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const serveOriginal = async () => {
    const object = await env.R2.get(key);
    if (!object) {
      return withImageHeaders(
        new Response("Image not found", { status: 404 }),
        {},
      );
    }

    const contentType =
      object.httpMetadata?.contentType ||
      getContentTypeFromKey(key) ||
      "application/octet-stream";

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", contentType);
    headers.set("ETag", object.httpEtag);

    return withImageHeaders(
      new Response(object.body, { headers }),
      CACHE_CONTROL.public,
    );
  };

  // 1. 防止循环调用 & 显式请求原图
  const viaHeader = request.headers.get("via");
  const isLoop = viaHeader && /image-resizing/.test(viaHeader);
  const wantsOriginal = searchParams.get("original") === "true";

  const isLocalDev =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";

  // Miniflare's local Image Resizing encodes AVIF extremely slowly (~30s for a
  // ~1MB hero image). Serve the R2 original in local dev; production still
  // goes through Cloudflare Image Resizing.
  // 2. 构建 Cloudflare Image Resizing 参数（只接受允许的宽度，其余返回原图）
  const transformOptions = parseImageTransform(
    searchParams,
    request.headers.get("Accept") || "",
  );
  if (
    isLoop ||
    wantsOriginal ||
    isLocalDev ||
    isGifKey(key) ||
    !transformOptions
  ) {
    return await serveOriginal();
  }

  // 3. 尝试进行图片处理
  try {
    // The transform names the stored file's version, so a replaced file is
    // transformed afresh; this read runs only when the edge has no copy.
    const stored = await env.R2.head(key);
    if (!stored) {
      return await serveOriginal();
    }
    const sourceImageUrl = getTransformSourceUrl(url, key, stored.etag);

    const subRequestHeaders = new Headers();

    const headersToKeep = ["user-agent", "accept"];
    for (const [k, v] of request.headers.entries()) {
      if (headersToKeep.includes(k.toLowerCase())) {
        subRequestHeaders.set(k, v);
      }
    }

    const imageRequest = new Request(sourceImageUrl, {
      headers: subRequestHeaders,
    });

    // 调用 Cloudflare Images 变换
    const response = await fetch(imageRequest, {
      cf: { image: transformOptions },
    });

    // 如果变换失败 (如格式不支持)，降级回原图
    if (!response.ok) {
      console.error(
        JSON.stringify({
          message: "image transform failed",
          key,
          status: response.status,
          statusText: response.statusText,
        }),
      );
      return await serveOriginal();
    }

    // 4. 返回处理后的图片
    // 使用 new Response(response.body, response) 保持状态码和其它优化头信息
    const newResponse = new Response(response.body, response);

    newResponse.headers.set("Vary", "Accept");
    // Browsers revalidate (the address outlives a replaced file); the tag
    // lets a revalidation of an unchanged variant answer without a body.
    newResponse.headers.set(
      "ETag",
      `"${stored.etag}-${transformOptions.width}-${transformOptions.format ?? "auto"}"`,
    );
    return withImageHeaders(newResponse, CACHE_CONTROL.media);
  } catch (e) {
    console.error(
      JSON.stringify({
        message: "image transform error",
        key,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return await serveOriginal();
  }
}
