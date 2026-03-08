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
export function getOptimizedImageUrl(key: string, width?: number) {
  return `/images/${key}?quality=80${width ? `&width=${width}` : ""}`;
}

export function buildTransformOptions(
  searchParams: URLSearchParams,
  accept: string,
) {
  const transformOptions: Record<string, unknown> = { quality: 80 };

  if (searchParams.has("width")) {
    const width = Number.parseInt(searchParams.get("width")!, 10);
    if (!Number.isNaN(width) && width > 0) transformOptions.width = width;
  }
  if (searchParams.has("height")) {
    const height = Number.parseInt(searchParams.get("height")!, 10);
    if (!Number.isNaN(height) && height > 0) transformOptions.height = height;
  }
  if (searchParams.has("quality")) {
    const quality = Number.parseInt(searchParams.get("quality")!, 10);
    if (!Number.isNaN(quality) && quality > 0 && quality <= 100)
      transformOptions.quality = quality;
  }
  if (searchParams.has("fit")) transformOptions.fit = searchParams.get("fit");

  if (/image\/avif/.test(accept)) {
    transformOptions.format = "avif";
  } else if (/image\/webp/.test(accept)) {
    transformOptions.format = "webp";
  }

  return transformOptions;
}
