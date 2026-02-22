import type {
  StartExportInput,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import type { Result } from "@/lib/error";
import {
  ExportManifestSchema,
  IMPORT_EXPORT_CACHE_KEYS,
  IMPORT_EXPORT_R2_KEYS,
  TaskProgressSchema,
} from "@/features/import-export/import-export.schema";
import * as CacheService from "@/features/cache/cache.service";
import { err, ok } from "@/lib/error";

export async function startExport(
  context: BaseContext,
  input: StartExportInput,
): Promise<Result<{ taskId: string }, { reason: "WORKFLOW_CREATE_FAILED" }>> {
  const taskId = crypto.randomUUID();

  const initialProgress: TaskProgress = {
    status: "pending",
    total: 0,
    completed: 0,
    current: "准备导出...",
    errors: [],
    warnings: [],
  };

  await CacheService.set(
    context,
    IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId),
    JSON.stringify(initialProgress),
    { ttl: "24h" },
  );

  try {
    await context.env.EXPORT_WORKFLOW.create({
      params: {
        taskId,
        postIds: input.postIds,
        status: input.status,
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "export workflow create failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    await CacheService.deleteKey(
      context,
      IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId),
    );
    return err({ reason: "WORKFLOW_CREATE_FAILED" });
  }

  return ok({ taskId });
}

export async function startImport(
  context: BaseContext,
  files: Array<File>,
): Promise<
  Result<
    { taskId: string; mode: "native" | "markdown" },
    { reason: "NO_FILES" | "UPLOAD_FAILED" | "WORKFLOW_CREATE_FAILED" }
  >
> {
  if (files.length === 0) {
    return err({ reason: "NO_FILES" });
  }

  const taskId = crypto.randomUUID();
  const r2Key = IMPORT_EXPORT_R2_KEYS.importZip(taskId);

  // 1. Build ZIP data + detect mode (before uploading to R2)
  let zipData: Uint8Array;
  let mode: "native" | "markdown";

  try {
    const {
      buildZip,
      parseZip,
      readValidatedJsonFile: readValidated,
    } = await import("@/features/import-export/utils/zip");

    const isZip = files.length === 1 && files[0].name.endsWith(".zip");

    if (isZip) {
      zipData = new Uint8Array(await files[0].arrayBuffer());
    } else {
      // Multiple .md files → pack into ZIP
      const zipEntries: Record<string, Uint8Array> = {};
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        zipEntries[file.name] = new Uint8Array(buffer);
      }
      zipData = buildZip(zipEntries);
    }

    // Detect mode from ZIP contents
    const zipFiles = parseZip(zipData);
    const manifest = readValidated(
      zipFiles,
      "manifest.json",
      ExportManifestSchema,
    );
    mode = manifest ? "native" : "markdown";
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "import file processing failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return err({ reason: "UPLOAD_FAILED" });
  }

  // 2. Upload to R2
  try {
    await context.env.R2.put(r2Key, zipData, {
      httpMetadata: { contentType: "application/zip" },
      customMetadata: { taskId },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "import upload to R2 failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return err({ reason: "UPLOAD_FAILED" });
  }

  // 3. Init progress + start workflow
  const initialProgress: TaskProgress = {
    status: "pending",
    total: 0,
    completed: 0,
    current: "准备导入...",
    errors: [],
    warnings: [],
  };

  await CacheService.set(
    context,
    IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId),
    JSON.stringify(initialProgress),
    { ttl: "24h" },
  );

  try {
    await context.env.IMPORT_WORKFLOW.create({
      params: { taskId, r2Key, mode },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "import workflow create failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    await CacheService.deleteKey(
      context,
      IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId),
    );
    return err({ reason: "WORKFLOW_CREATE_FAILED" });
  }

  return ok({ taskId, mode });
}

export async function getExportProgress(
  context: BaseContext,
  taskId: string,
): Promise<TaskProgress | null> {
  const raw = await CacheService.getRaw(
    context,
    IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId),
  );
  return parseProgress(raw);
}

export async function getImportProgress(
  context: BaseContext,
  taskId: string,
): Promise<TaskProgress | null> {
  const raw = await CacheService.getRaw(
    context,
    IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId),
  );
  return parseProgress(raw);
}

export function getExportDownloadUrl(taskId: string): string {
  return `/api/admin/export/download/${taskId}`;
}

function parseProgress(raw: string | null): TaskProgress | null {
  if (!raw) return null;
  try {
    const parsed = TaskProgressSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error(
        JSON.stringify({
          message: "invalid progress data in KV",
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
