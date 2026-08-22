import type { CacheKey } from "./types";

/**
 * 将 CacheKey 序列化为字符串
 * 示例: ["posts", "list", "tech", 1] -> "posts:list:tech:1"
 */
export function serializeKey(key: CacheKey): string {
  if (typeof key === "string") return key;
  return key
    .map((k) => {
      if (k === null || k === undefined) return "_";
      return String(k);
    })
    .join(":");
}
