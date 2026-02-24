import type { MediaCategory } from "./media.schema";

export function getContentTypeFromKey(key: string): string | undefined {
  const extension = key.split(".").pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    // Guitar Pro
    gp3: "application/x-guitar-pro",
    gp4: "application/x-guitar-pro",
    gp5: "application/x-guitar-pro",
    gpx: "application/x-guitar-pro",
    gp: "application/x-guitar-pro",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    m4a: "audio/mp4",
    weba: "audio/webm",
  };
  return contentTypes[extension || ""];
}

/** 判断 MIME 类型是否为 Guitar Pro 文件 */
export function isGuitarProMimeType(mimeType: string): boolean {
  return mimeType === "application/x-guitar-pro";
}

/** 判断文件名是否为 Guitar Pro 文件 */
export function isGuitarProFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return [".gp3", ".gp4", ".gp5", ".gpx", ".gp"].includes(ext);
}

/** 判断文件名是否为视频文件 */
export function isVideoFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
}

/** 判断文件名是否为音频文件 */
export function isAudioFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".weba"].includes(ext);
}

/** 根据文件名或 MIME 推断媒体分类 */
export function getMediaCategoryFromKey(key: string, mimeType?: string): MediaCategory {
  if (isGuitarProFile(key)) return "guitar-pro";
  if (isVideoFile(key) || mimeType?.startsWith("video/")) return "video";
  if (isAudioFile(key) || mimeType?.startsWith("audio/")) return "audio";
  return "image";
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
export function getOptimizedImageUrl(key: string, width?: number) {
  return `/images/${key}?quality=80${width ? `&width=${width}` : ""}`;
}

export function buildTransformOptions(
  searchParams: URLSearchParams,
  accept: string,
) {
  const transformOptions: Record<string, unknown> = { quality: 80 };

  if (searchParams.has("width"))
    transformOptions.width = Number.parseInt(searchParams.get("width")!, 10);
  if (searchParams.has("height"))
    transformOptions.height = Number.parseInt(searchParams.get("height")!, 10);
  if (searchParams.has("quality"))
    transformOptions.quality = Number.parseInt(
      searchParams.get("quality")!,
      10,
    );
  if (searchParams.has("fit")) transformOptions.fit = searchParams.get("fit");

  if (/image\/avif/.test(accept)) {
    transformOptions.format = "avif";
  } else if (/image\/webp/.test(accept)) {
    transformOptions.format = "webp";
  }

  return transformOptions;
}
