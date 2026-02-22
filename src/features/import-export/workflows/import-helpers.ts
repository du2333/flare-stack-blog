import type { JSONContent } from "@tiptap/react";
import type { PostEntry } from "@/features/import-export/import-export.schema";
import { getDb } from "@/lib/db";
import { generateKey } from "@/features/media/media.utils";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as TagRepo from "@/features/tags/data/tags.data";
import * as MediaRepo from "@/features/media/data/media.data";
import { syncPostMedia } from "@/features/posts/data/post-media.data";
import { highlightCodeBlocks, slugify } from "@/features/posts/utils/content";
import * as PostService from "@/features/posts/posts.service";
import {
  listDirectories,
  listFiles,
  readJsonFile,
  readTextFile,
} from "@/features/import-export/utils/zip";
import {
  normalizeFrontmatter,
  parseFrontmatter,
} from "@/features/import-export/utils/frontmatter";
import { rewriteImagePaths } from "@/features/import-export/utils/image-rewriter";
import { markdownToJsonContent } from "@/features/import-export/utils/markdown-parser";

// --- Enumerate posts (pure — no env dependency) ---

export function enumerateNativePosts(
  zipFiles: Record<string, Uint8Array>,
): Array<PostEntry> {
  const dirs = listDirectories(zipFiles, "posts/");
  return dirs.map((dir) => {
    const mdContent = readTextFile(zipFiles, `posts/${dir}/index.md`);
    const parsed = mdContent ? parseFrontmatter(mdContent) : null;
    return {
      dir,
      title: (parsed?.data.title as string) || dir,
      prefix: `posts/${dir}`,
    };
  });
}

export function enumerateMarkdownPosts(
  zipFiles: Record<string, Uint8Array>,
): Array<PostEntry> {
  const mdFiles = Object.keys(zipFiles).filter(
    (p) => p.endsWith(".md") && !p.startsWith("__MACOSX"),
  );
  return mdFiles.map((path) => {
    const dir = path.replace(/\.md$/, "").split("/").pop() || path;
    const mdContent = readTextFile(zipFiles, path);
    const parsed = mdContent ? parseFrontmatter(mdContent) : null;
    return {
      dir,
      title: (parsed?.data.title as string) || dir,
      prefix: path.substring(0, path.lastIndexOf("/")),
      mdPath: path,
    };
  });
}

// --- Import single post (needs env for DB / R2) ---

export async function importSinglePost(
  env: Env,
  zipFiles: Record<string, Uint8Array>,
  entry: PostEntry,
  mode: "native" | "markdown",
): Promise<{
  title: string;
  slug: string;
  skipped?: boolean;
  warnings: Array<string>;
}> {
  const db = getDb(env);
  const context: DbContext = { db, env };
  const warnings: Array<string> = [];

  // 1. Parse content
  let contentJson: JSONContent | null = null;
  let metadata: Record<string, unknown> = {};

  if (mode === "native") {
    const rawJson = readJsonFile<JSONContent>(
      zipFiles,
      `${entry.prefix}/content.json`,
    );
    if (rawJson) {
      contentJson = rawJson;
    }

    const mdContent = readTextFile(zipFiles, `${entry.prefix}/index.md`);
    if (mdContent) {
      const { data, content } = parseFrontmatter(mdContent);
      metadata = data;

      if (!contentJson && content.trim()) {
        try {
          contentJson = await markdownToJsonContent(content);
        } catch (error) {
          warnings.push(
            `Markdown 转换失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  } else {
    const mdPath = entry.mdPath || `${entry.prefix}/${entry.dir}.md`;
    const mdContent = readTextFile(zipFiles, mdPath);
    if (mdContent) {
      const { data, content } = parseFrontmatter(mdContent);
      metadata = data;

      if (content.trim()) {
        try {
          contentJson = await markdownToJsonContent(content);
        } catch (error) {
          warnings.push(
            `Markdown 转换失败: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  // 2. Normalize frontmatter + check duplicate
  const normalized = normalizeFrontmatter(metadata);
  const title = normalized.title || entry.title || "Untitled";

  const candidateSlug = normalized.slug || title;
  const slugAlreadyExists = await PostRepo.slugExists(
    db,
    slugify(candidateSlug),
  );
  if (slugAlreadyExists) {
    return { title, slug: candidateSlug, skipped: true, warnings };
  }

  // 3. Upload images and rewrite paths
  if (contentJson) {
    const imageResult = await uploadImages(env, zipFiles, entry);
    warnings.push(...imageResult.warnings);
    if (imageResult.rewriteMap.size > 0) {
      contentJson = rewriteImagePaths(contentJson, imageResult.rewriteMap);
    }
  }

  // 4. Highlight code blocks
  if (contentJson) {
    try {
      contentJson = await highlightCodeBlocks(contentJson);
    } catch {
      // Non-critical, continue without highlighting
    }
  }

  // 5. Generate unique slug
  const { slug } = await PostService.generateSlug(context, {
    title: normalized.slug || title,
  });

  // 6. Resolve tags
  const tagIds: Array<number> = [];
  if (normalized.tags && normalized.tags.length > 0) {
    for (const tagName of normalized.tags) {
      let tag = await TagRepo.findTagByName(db, tagName);
      if (!tag) {
        tag = await TagRepo.insertTag(db, { name: tagName });
      }
      tagIds.push(tag.id);
    }
  }

  // 7. Insert post
  const post = await PostRepo.insertPost(db, {
    title,
    slug,
    summary: normalized.summary ?? null,
    contentJson,
    status: normalized.status === "draft" ? "draft" : "published",
    readTimeInMinutes: normalized.readTimeInMinutes ?? 1,
    publishedAt: normalized.publishedAt
      ? new Date(normalized.publishedAt)
      : normalized.status !== "draft"
        ? new Date()
        : null,
  });

  // 8. Link tags
  if (tagIds.length > 0) {
    const { PostTagsTable } = await import("@/lib/db/schema");
    await db
      .insert(PostTagsTable)
      .values(tagIds.map((tagId) => ({ postId: post.id, tagId })));
  }

  // 9. Sync post-media relationships
  if (contentJson) {
    await syncPostMedia(db, post.id, contentJson);
  }

  return { title: post.title, slug: post.slug, warnings };
}

// --- Image upload (needs env for R2) ---

export async function uploadImages(
  env: Env,
  zipFiles: Record<string, Uint8Array>,
  entry: PostEntry,
): Promise<{ rewriteMap: Map<string, string>; warnings: Array<string> }> {
  const rewriteMap = new Map<string, string>();
  const warnings: Array<string> = [];
  const imagePrefix = `${entry.prefix}/images/`;
  const imageFiles = listFiles(zipFiles, imagePrefix);

  for (const imagePath of imageFiles) {
    if (!(imagePath in zipFiles)) continue;
    const imageData = zipFiles[imagePath];
    if (imageData.length === 0) continue;

    const oldKey = imagePath.slice(imagePrefix.length);
    const newKey = generateKey(oldKey);

    const ext = oldKey.split(".").pop()?.toLowerCase() || "bin";
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    try {
      await env.R2.put(newKey, imageData, {
        httpMetadata: { contentType: mimeType },
        customMetadata: { originalName: oldKey },
      });

      await MediaRepo.insertMedia(getDb(env), {
        key: newKey,
        url: `/images/${newKey}`,
        fileName: oldKey,
        mimeType,
        sizeInBytes: imageData.length,
      });

      rewriteMap.set(oldKey, newKey);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "image upload failed during import",
          imagePath,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      warnings.push(`图片上传失败: ${oldKey}`);
    }
  }

  return { rewriteMap, warnings };
}
