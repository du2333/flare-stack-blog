import * as CacheService from "@/features/cache/cache.service";
import type {
  StartExportInput,
  TaskProgress,
} from "@/features/import-export/import-export.schema";
import {
  ExportManifestSchema,
  IMPORT_EXPORT_CACHE_KEYS,
  IMPORT_EXPORT_R2_KEYS,
  TaskProgressSchema,
} from "@/features/import-export/import-export.schema";
import { serverEnv } from "@/lib/env/server.env";
import { err, ok } from "@/lib/errors";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

function getRequestLocaleOrDefault(env: Env) {
  try {
    return getLocale();
  } catch {
    return serverEnv(env).LOCALE;
  }
}

export async function startExport(
  context: BaseContext,
  input: StartExportInput,
) {
  const taskId = crypto.randomUUID();
  const locale = getRequestLocaleOrDefault(context.env);

  const initialProgress: TaskProgress = {
    status: "pending",
    total: 0,
    completed: 0,
    current: m.import_export_progress_export_pending({}, { locale }),
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
        locale,
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

export async function startImport(context: BaseContext, files: Array<File>) {
  if (files.length === 0) {
    return err({ reason: "NO_FILES" });
  }

  const taskId = crypto.randomUUID();
  const r2Key = IMPORT_EXPORT_R2_KEYS.importZip(taskId);
  const locale = getRequestLocaleOrDefault(context.env);

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
    current: m.import_export_progress_import_pending({}, { locale }),
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
      params: { taskId, r2Key, mode, locale },
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

export async function getExportProgress(context: BaseContext, taskId: string) {
  const raw = await CacheService.getRaw(
    context,
    IMPORT_EXPORT_CACHE_KEYS.exportProgress(taskId),
  );
  return parseProgress(raw);
}

export async function getImportProgress(context: BaseContext, taskId: string) {
  const raw = await CacheService.getRaw(
    context,
    IMPORT_EXPORT_CACHE_KEYS.importProgress(taskId),
  );
  return parseProgress(raw);
}

export function getExportDownloadUrl(taskId: string): string {
  return `/api/admin/export/download/${taskId}`;
}

function parseProgress(raw: string | null) {
  if (!raw) return err({ reason: "TASK_NOT_FOUND" });
  try {
    const parsed = TaskProgressSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error(
        JSON.stringify({
          message: "invalid progress data in KV",
          errors: parsed.error.issues,
        }),
      );
      return err({ reason: "INVALID_PROGRESS_DATA" });
    }
    return ok(parsed.data);
  } catch {
    return err({ reason: "INVALID_PROGRESS_DATA" });
  }
}
