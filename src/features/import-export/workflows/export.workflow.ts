import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type {
  ExportManifest,
  PostFrontmatter,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import { getDb } from "@/lib/db";
import * as PostRepo from "@/features/posts/data/posts.data";
import * as CacheService from "@/features/cache/cache.service";
import { getFromR2 } from "@/features/media/data/media.storage";
import { extractAllImageKeys } from "@/features/posts/utils/content";
import {
  jsonContentToMarkdown,
  makeExportImageRewriter,
} from "@/features/import-export/utils/markdown-serializer";
import { stringifyFrontmatter } from "@/features/import-export/utils/frontmatter";
import { buildZip } from "@/features/import-export/utils/zip";
import {
  EXPORT_MANIFEST_VERSION,
  IMPORT_EXPORT_CACHE_KEYS,
  IMPORT_EXPORT_R2_KEYS,
} from "@/features/import-export/import-export.schema";

export class ExportWorkflow extends WorkflowEntrypoint<
  Env,
  ExportWorkflowParams
> {
  async run(event: WorkflowEvent<ExportWorkflowParams>, step: WorkflowStep) {
    const { taskId, postIds, status } = event.payload;
    const progressKey = IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId);

    // 1. Fetch posts
    const posts = await step.do("fetch posts", async () => {
      const db = getDb(this.env);

      return await PostRepo.findFullPosts(db, {
        ids: postIds && postIds.length > 0 ? postIds : undefined,
        status: status ?? undefined,
      });
    });

    if (posts.length === 0) {
      await this.updateProgress(progressKey, {
        status: "completed",
        total: 0,
        completed: 0,
        current: "",
        errors: [],
        warnings: ["没有找到可导出的文章"],
      });
      return;
    }

    // 2. Build export data: serialize each post and download its images
    const zipFiles: Record<string, Uint8Array | string> = {};
    const warnings: Array<string> = [];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      await step.do(
        `process post ${i + 1}/${posts.length}: ${post.slug}`,
        async () => {
          const slug = post.slug;
          const prefix = `posts/${slug}`;

          // Generate frontmatter
          const frontmatter: PostFrontmatter = {
            title: post.title,
            slug: post.slug,
            summary: post.summary ?? undefined,
            status: post.status,
            publishedAt: post.publishedAt?.toISOString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            readTimeInMinutes: post.readTimeInMinutes,
            tags: post.tags.map((t) => t.name),
          };

          // Convert content to Markdown
          const rewriter = makeExportImageRewriter();
          const markdown = post.contentJson
            ? jsonContentToMarkdown(post.contentJson, {
                rewriteImageSrc: rewriter,
              })
            : "";

          // Write index.md with frontmatter
          zipFiles[`${prefix}/index.md`] = stringifyFrontmatter(
            frontmatter,
            markdown,
          );

          // Write content.json (lossless backup)
          if (post.contentJson) {
            zipFiles[`${prefix}/content.json`] = JSON.stringify(
              post.contentJson,
              null,
              2,
            );
          }

          // Download images from R2
          if (post.contentJson) {
            const imageKeys = extractAllImageKeys(post.contentJson);
            for (const key of imageKeys) {
              try {
                const r2Object = await getFromR2(this.env, key);
                if (r2Object) {
                  const arrayBuffer = await r2Object.arrayBuffer();
                  zipFiles[`${prefix}/images/${key}`] = new Uint8Array(
                    arrayBuffer,
                  );
                } else {
                  warnings.push(
                    `图片 ${key} 在 R2 中未找到（文章: ${post.title}）`,
                  );
                }
              } catch (error) {
                warnings.push(
                  `下载图片 ${key} 失败（文章: ${post.title}）: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            }
          }

          // Update progress
          await this.updateProgress(progressKey, {
            status: "processing",
            total: posts.length,
            completed: i + 1,
            current: post.title,
            errors: [],
            warnings,
          });
        },
      );
    }

    // 3. Add tags.json and manifest.json
    await step.do("build and upload zip", async () => {
      // Derive unique tags from exported posts
      const uniqueTagsMap = new Map<string, (typeof posts)[0]["tags"][0]>();
      for (const post of posts) {
        for (const tag of post.tags) {
          uniqueTagsMap.set(tag.name, tag);
        }
      }

      zipFiles["tags.json"] = JSON.stringify(
        Array.from(uniqueTagsMap.values()).map((t) => ({
          name: t.name,
          createdAt: t.createdAt.toISOString(),
        })),
        null,
        2,
      );

      const manifest: ExportManifest = {
        version: EXPORT_MANIFEST_VERSION,
        exportedAt: new Date().toISOString(),
        postCount: posts.length,
        generator: "blog-cms",
      };
      zipFiles["manifest.json"] = JSON.stringify(manifest, null, 2);

      // Build ZIP
      const zipData = buildZip(zipFiles);

      // Upload ZIP to R2
      const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);
      await this.env.R2.put(r2Key, zipData, {
        httpMetadata: { contentType: "application/zip" },
        customMetadata: { taskId },
      });

      // Mark completed
      await this.updateProgress(progressKey, {
        status: "completed",
        total: posts.length,
        completed: posts.length,
        current: "",
        errors: [],
        warnings,
        downloadKey: r2Key,
      });
    });

    // 5. Cleanup R2 after 24h
    const cleanupTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await step.sleepUntil("cleanup delay", cleanupTime);

    await step.do("cleanup export zip", async () => {
      const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);
      try {
        await this.env.R2.delete(r2Key);
      } catch {
        // Ignore cleanup errors
      }
    });
  }

  private async updateProgress(key: string, progress: TaskProgress) {
    await CacheService.set({ env: this.env }, key, JSON.stringify(progress), {
      ttl: "24h",
    });
  }
}
