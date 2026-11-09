import { withoutControlCharacters } from "@/lib/unicode-text";

/** The longest file name a Media can have, the usual limit of a file system. */
export const MEDIA_NAME_MAX_LENGTH = 255;

/**
 * How an image is used: by a post's draft or published version or by a
 * Moment (`current`), only in Post Revisions, which restoring would bring back
 * (`revisions-only`), or not at all.
 */
export function mediaUsageOf(counts: {
  postCount: number;
  revisionOnlyPostCount: number;
  momentCount: number;
}): "current" | "revisions-only" | "none" {
  if (counts.postCount > 0 || counts.momentCount > 0) return "current";
  return counts.revisionOnlyPostCount > 0 ? "revisions-only" : "none";
}

const IMAGE_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/** `mimeType` as one name per image type: lower case, no parameters, image/jpg as image/jpeg. */
export function normalizeImageType(mimeType: string) {
  const type = mimeType.split(";")[0].trim().toLowerCase();
  return type === "image/jpg" ? "image/jpeg" : type;
}

/** Whether two content types are the same image type. */
export function isSameImageType(a: string, b: string) {
  return normalizeImageType(a) === normalizeImageType(b);
}

/** The extension an image of `mimeType` is stored with. */
export function imageExtensionOf(mimeType: string) {
  return IMAGE_TYPE_EXTENSIONS[normalizeImageType(mimeType)] ?? "jpg";
}

// Extensions of image files. One of these on a name that does not match the
// image's type is replaced; any other ending (`v1.2`) is part of the name.
const IMAGE_FILE_EXTENSION =
  /\.(?:jpe?g|png|webp|gif|svg|avif|bmp|ico|tiff?|heic)$/i;

/**
 * A file name for Media as the Admin could rename it to: control and format
 * characters taken out, trimmed, and cut to `MEDIA_NAME_MAX_LENGTH` characters
 * without losing its extension. Empty when nothing is left.
 */
export function cleanMediaName(name: string) {
  const cleaned = withoutControlCharacters(name, { emoji: true }).trim();
  if (cleaned.length <= MEDIA_NAME_MAX_LENGTH) return cleaned;
  const extension = cleaned.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] ?? "";
  const base = Array.from(cleaned.slice(0, cleaned.length - extension.length));
  while (base.join("").length > MEDIA_NAME_MAX_LENGTH - extension.length) {
    base.pop();
  }
  return `${base.join("").trim()}${extension}`;
}

/**
 * The file name of an image taken from an address: `name`, the Admin's or the
 * last part of the address, with the extension of the type the response turned
 * out to be. The stored key takes its extension from this name, so it must not
 * name another type. A name with nothing left is `image.<ext>`.
 */
export function importedMediaName(name: string, mimeType: string) {
  const extension = imageExtensionOf(mimeType);
  const cleaned = cleanMediaName(name);
  if (!cleaned) return `image.${extension}`;
  const current = cleaned.match(IMAGE_FILE_EXTENSION)?.[0];
  if (!current) return cleanMediaName(`${cleaned}.${extension}`);
  const stem = cleaned.slice(0, -current.length).trim();
  if (!stem) return `image.${extension}`;
  const own = current.slice(1).toLowerCase();
  // jpeg and jpg are one type; the name keeps the one it has.
  if (own === extension || (own === "jpeg" && extension === "jpg")) {
    return cleaned;
  }
  return cleanMediaName(`${stem}.${extension}`);
}

export function getContentTypeFromKey(key: string): string | undefined {
  const extension = key.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return contentTypes[extension || ""];
}

export function generateKey(fileName: string): string {
  const uuid = crypto.randomUUID();
  const extension = fileName.split(".").pop()?.toLowerCase() || "bin";

  return `${uuid}.${extension}`;
}

/**
 * 从图片 URL 中提取 R2 key
 * 支持格式：
 * - /images/${key}
 * - /images/${key}?quality=80&format=webp
 * - https://domain.com/images/${key}?quality=80
 */
export function extractImageKey(src: string): string | undefined {
  if (!src) return undefined;

  const prefix = "/images/";
  let pathname = "";

  try {
    // 尝试解析为 URL
    const url = new URL(src, "http://dummy.com"); // 传入 base 确保相对路径也能被解析
    pathname = url.pathname;
  } catch {
    // 极少数情况解析失败，手动截断 query
    pathname = src.split("?")[0];
  }

  if (pathname.startsWith(prefix)) {
    return pathname.replace(prefix, "");
  }
  return undefined;
}

/**
 * 生成优化后的图片 URL
 * @param key - R2 key
 * @param width - 可选的宽度限制
 */
export function isGifKey(key: string, contentType?: string | null) {
  return key.toLowerCase().endsWith(".gif") || contentType === "image/gif";
}

export const PUBLIC_IMAGE_WIDTH = {
  banner: 1600,
  cover: 800,
  body: 800,
  avatar: 400,
  // The lightbox; Cloudflare never upscales, so smaller originals keep their size.
  zoom: 2560,
} as const;

export function getOriginalImageUrl(key: string) {
  return `/images/${key}`;
}

/**
 * The original an image transform reads. Cloudflare keeps transformed images
 * by their source URL, and only a zone purge clears that, so the source names
 * the stored file's version (its R2 ETag): once a file is replaced at the same
 * key, transforms read and cache the new one.
 */
export function getTransformSourceUrl(
  requestUrl: URL,
  key: string,
  fileVersion: string,
) {
  const source = new URL(getOriginalImageUrl(key), requestUrl.origin);
  source.searchParams.set("original", "true");
  source.searchParams.set("v", fileVersion);
  return source.toString();
}

export function getOptimizedImageUrl(key: string, width?: number) {
  if (isGifKey(key)) {
    return `/images/${key}?original=true`;
  }
  return `/images/${key}?quality=80${width ? `&width=${width}` : ""}`;
}

/** A `srcset` of transformed widths, or undefined when the image is not transformed. */
export function getPublicImageSrcSet(
  src: string,
  widths: ReadonlyArray<number>,
) {
  const key = extractImageKey(src);
  if (!key || isGifKey(key)) return undefined;
  return widths
    .map((width) => `${getPublicImageSrc(src, width)} ${width}w`)
    .join(", ");
}

export function getPublicImageSrc(src: string, width: number) {
  const key = extractImageKey(src);
  if (!key) return src;
  const version = new URL(src, "http://dummy.com").searchParams.get("v");
  const optimized = getOptimizedImageUrl(key, width);
  if (!version) return optimized;
  const next = new URL(optimized, "http://dummy.com");
  next.searchParams.set("v", version);
  return `${next.pathname}${next.search}`;
}

// Cloudflare bills each image and parameter set once a month, so only the
// widths the site requests are transformed. Anything else gets the original,
// which keeps arbitrary parameters from using up the transformation quota.
export const IMAGE_TRANSFORM_WIDTHS = [400, 800, 1600, 2560] as const;
const IMAGE_TRANSFORM_QUALITY = 80;
const IMAGE_TRANSFORM_PARAMS = new Set(["width", "quality", "v"]);

/**
 * The Cloudflare transform for a public image request, or null to serve the
 * original. Only an allowed width at the site's quality is transformed.
 */
export function parseImageTransform(
  searchParams: URLSearchParams,
  accept: string,
) {
  for (const name of searchParams.keys()) {
    if (!IMAGE_TRANSFORM_PARAMS.has(name)) return null;
  }
  const width = Number(searchParams.get("width"));
  if (!IMAGE_TRANSFORM_WIDTHS.some((allowed) => allowed === width)) return null;
  const quality = searchParams.get("quality");
  if (quality !== null && Number(quality) !== IMAGE_TRANSFORM_QUALITY) {
    return null;
  }

  const format: "avif" | "webp" | undefined = /image\/avif/.test(accept)
    ? "avif"
    : /image\/webp/.test(accept)
      ? "webp"
      : undefined;
  return {
    width,
    quality: IMAGE_TRANSFORM_QUALITY,
    ...(format ? { format } : {}),
  };
}
