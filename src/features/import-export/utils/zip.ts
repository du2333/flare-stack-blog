import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import type { z } from "zod";

/**
 * 构建 ZIP 文件
 * @param files 文件路径 → 内容的映射
 * @returns ZIP 二进制数据
 */
export function buildZip(
  files: Record<string, Uint8Array | string>,
): Uint8Array {
  const prepared: Record<string, Uint8Array> = {};

  for (const [path, content] of Object.entries(files)) {
    prepared[path] = typeof content === "string" ? strToU8(content) : content;
  }

  return zipSync(prepared, { level: 6 });
}

/**
 * 解析 ZIP 文件
 * @param data ZIP 二进制数据
 * @returns 文件路径 → 内容的映射
 */
export function parseZip(data: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(data);
}

/**
 * 从 ZIP 中读取文本文件
 */
export function readTextFile(
  files: Record<string, Uint8Array>,
  path: string,
): string | null {
  if (!(path in files)) return null;
  return strFromU8(files[path]);
}

/**
 * 从 ZIP 中读取并校验 JSON 文件
 */
export function readValidatedJsonFile<TSchema extends z.ZodSchema>(
  files: Record<string, Uint8Array>,
  path: string,
  schema: TSchema,
): z.infer<TSchema> | null {
  const text = readTextFile(files, path);
  if (!text) return null;
  try {
    const json = JSON.parse(text);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      console.error(
        JSON.stringify({
          message: "ZIP JSON validation failed",
          path,
          errors: parsed.error.issues,
        }),
      );
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * 从 ZIP 中读取 JSON 文件（不推荐，建议使用 readValidatedJsonFile）
 */
export function readJsonFile<T = unknown>(
  files: Record<string, Uint8Array>,
  path: string,
): T | null {
  const text = readTextFile(files, path);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * 列出 ZIP 中匹配前缀的文件路径
 */
export function listFiles(
  files: Record<string, Uint8Array>,
  prefix: string,
): Array<string> {
  return Object.keys(files).filter((p) => p.startsWith(prefix));
}

/**
 * 列出 ZIP 中的顶层目录名（在指定前缀下）
 * 例如 prefix="posts/" → ["my-post", "another-post"]
 */
export function listDirectories(
  files: Record<string, Uint8Array>,
  prefix: string,
): Array<string> {
  const dirs = new Set<string>();
  for (const path of Object.keys(files)) {
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      const dirName = rest.split("/")[0];
      if (dirName) dirs.add(dirName);
    }
  }
  return Array.from(dirs);
}
