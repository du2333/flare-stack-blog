import type { SiteConfig } from "@/features/config/site-config.schema";

/** Material 风格渐变(无封面图且未配置兜底图源时,按 slug 稳定取色) */
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
];

function gradientCoverFor(slug: string): string {
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) + hash + slug.charCodeAt(i)) >>> 0;
  }
  hash = (hash ^ (slug.length << 8)) >>> 0;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

/**
 * 封面背景样式值:文章封面图 > 兜底图源(支持 {slug} 占位,按文章稳定取图) > slug 渐变。
 */
export function coverBackgroundValue(
  siteConfig: SiteConfig,
  slug: string,
  coverImage: string | null | undefined,
): string {
  if (coverImage) {
    return `url("${coverImage}")`;
  }

  const source = siteConfig.theme.cuckoo.defaultCover;
  if (source) {
    const url = source.includes("{slug}")
      ? source.replaceAll("{slug}", encodeURIComponent(slug))
      : source;
    return `url("${url}")`;
  }

  return gradientCoverFor(slug);
}
