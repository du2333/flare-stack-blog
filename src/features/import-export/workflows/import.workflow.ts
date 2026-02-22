import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type {
  ImportReport,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import { IMPORT_EXPORT_CACHE_KEYS } from "@/features/import-export/import-export.schema";
import { parseZip } from "@/features/import-export/utils/zip";
import * as CacheService from "@/features/cache/cache.service";
import {
  enumerateMarkdownPosts,
  enumerateNativePosts,
  importSinglePost,
} from "@/features/import-export/workflows/import-helpers";

export class ImportWorkflow extends WorkflowEntrypoint<
  Env,
  ImportWorkflowParams
> {
  async run(event: WorkflowEvent<ImportWorkflowParams>, step: WorkflowStep) {
    const { taskId, r2Key, mode } = event.payload;
    const progressKey = IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId);

    console.log(
      JSON.stringify({ message: "import workflow started", taskId, mode }),
    );

    try {
      // 1. Enumerate posts from ZIP
      // NOTE: step.do() serializes return values as JSON for durability.
      // Uint8Array does NOT survive JSON round-tripping, so we must NOT
      // return binary data from steps. Instead, each step re-fetches the
      // ZIP from R2 when it needs the binary content.
      const postEntries = await step.do("enumerate posts", async () => {
        const zipFiles = await this.fetchZipFiles(r2Key);
        if (mode === "native") {
          return enumerateNativePosts(zipFiles);
        }
        return enumerateMarkdownPosts(zipFiles);
      });

      console.log(
        JSON.stringify({
          message: "posts enumerated",
          taskId,
          count: postEntries.length,
        }),
      );

      if (postEntries.length === 0) {
        await this.updateProgress(progressKey, {
          status: "completed",
          total: 0,
          completed: 0,
          current: "",
          errors: [],
          warnings: ["ZIP 中没有找到可导入的文章"],
          report: { succeeded: [], failed: [], warnings: [] },
        });
        return;
      }

      // 2. Process each post
      // Each step returns a delta (serializable). Accumulation happens outside
      // steps so it re-executes correctly on workflow restart/replay.
      const report: ImportReport = {
        succeeded: [],
        failed: [],
        warnings: [],
      };

      for (let i = 0; i < postEntries.length; i++) {
        const entry = postEntries[i];

        const delta = await step.do(
          `import post ${i + 1}/${postEntries.length}: ${entry.title || entry.dir}`,
          async () => {
            const stepReport: ImportReport = {
              succeeded: [],
              failed: [],
              warnings: [],
            };

            try {
              const zipFiles = await this.fetchZipFiles(r2Key);
              const result = await importSinglePost(
                this.env,
                zipFiles,
                entry,
                mode,
              );
              if (result.skipped) {
                stepReport.warnings.push(
                  `[${result.title}] 已存在相同 slug，跳过导入`,
                );
              } else {
                stepReport.succeeded.push({
                  title: result.title,
                  slug: result.slug,
                });
              }
              for (const w of result.warnings) {
                stepReport.warnings.push(`[${result.title}] ${w}`);
              }
            } catch (error) {
              const reason =
                error instanceof Error ? error.message : String(error);
              stepReport.failed.push({
                title: entry.title || entry.dir,
                reason,
              });
            }

            return stepReport;
          },
        );

        // Accumulate outside step — on replay, cached return values flow here
        report.succeeded.push(...delta.succeeded);
        report.failed.push(...delta.failed);
        report.warnings.push(...delta.warnings);

        console.log(
          JSON.stringify({
            message: "post import step completed",
            taskId,
            step: i + 1,
            total: postEntries.length,
            title: entry.title || entry.dir,
            succeeded: delta.succeeded.length,
            failed: delta.failed.length,
          }),
        );

        // Progress update outside step — idempotent KV write, safe on replay
        await this.updateProgress(progressKey, {
          status: "processing",
          total: postEntries.length,
          completed: i + 1,
          current: entry.title || entry.dir,
          errors: report.failed.map((f) => ({
            post: f.title,
            reason: f.reason,
          })),
          warnings: report.warnings,
        });
      }

      // 3. Cleanup and finalize
      await step.do("finalize", async () => {
        try {
          await this.env.R2.delete(r2Key);
        } catch {
          // Ignore cleanup errors
        }

        await this.updateProgress(progressKey, {
          status: "completed",
          total: postEntries.length,
          completed: postEntries.length,
          current: "",
          errors: report.failed.map((f) => ({
            post: f.title,
            reason: f.reason,
          })),
          warnings: report.warnings,
          report,
        });
      });

      console.log(
        JSON.stringify({
          message: "import workflow completed",
          taskId,
          succeeded: report.succeeded.length,
          failed: report.failed.length,
          warnings: report.warnings.length,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "import workflow failed",
          taskId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      await this.updateProgress(progressKey, {
        status: "failed",
        total: 0,
        completed: 0,
        current: "",
        errors: [],
        warnings: [error instanceof Error ? error.message : "未知错误"],
      });
    }
  }

  private async fetchZipFiles(
    r2Key: string,
  ): Promise<Record<string, Uint8Array>> {
    const r2Object = await this.env.R2.get(r2Key);
    if (!r2Object) {
      throw new Error("ZIP 文件未找到");
    }
    const arrayBuffer = await r2Object.arrayBuffer();
    return parseZip(new Uint8Array(arrayBuffer));
  }

  private async updateProgress(key: string, progress: TaskProgress) {
    const context: BaseContext = { env: this.env };
    await CacheService.set(context, key, JSON.stringify(progress), {
      ttl: "24h",
    });
  }
}
