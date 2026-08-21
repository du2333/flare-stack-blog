import { z } from "zod";
import {
  GetProgressInputSchema,
  StartExportInputSchema,
  TaskProgressSchema,
} from "@/features/import-export/import-export.schema";
import * as ImportExportService from "@/features/import-export/import-export.service";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const importExportErrors = {
  WORKFLOW_CREATE_FAILED: {
    status: 500,
    message: "Failed to start import/export workflow.",
  },
  NO_FILES: { status: 400, message: "No files were uploaded." },
  UPLOAD_FAILED: { status: 500, message: "Failed to upload import files." },
  TASK_NOT_FOUND: { status: 404, message: "Task not found." },
  INVALID_PROGRESS_DATA: {
    status: 500,
    message: "Task progress data is invalid.",
  },
} as const;

const startExport = adminProcedure
  .errors(importExportErrors)
  .route({
    method: "POST",
    path: "/admin/export",
    summary: "Start an export task",
    tags: ["Admin Import Export"],
  })
  .input(StartExportInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(ImportExportService.startExport(context, input), {
      WORKFLOW_CREATE_FAILED: () => {
        throw errors.WORKFLOW_CREATE_FAILED();
      },
    }),
  );

const exportProgress = adminProcedure
  .errors(importExportErrors)
  .route({
    method: "GET",
    path: "/admin/export/{taskId}",
    summary: "Get export task progress",
    tags: ["Admin Import Export"],
  })
  .input(GetProgressInputSchema)
  .output(TaskProgressSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(ImportExportService.getExportProgress(context, input.taskId), {
      TASK_NOT_FOUND: () => {
        throw errors.TASK_NOT_FOUND();
      },
      INVALID_PROGRESS_DATA: () => {
        throw errors.INVALID_PROGRESS_DATA();
      },
    }),
  );

const startImport = adminProcedure
  .errors(importExportErrors)
  .route({
    method: "POST",
    path: "/admin/import",
    summary: "Upload files and start an import task",
    tags: ["Admin Import Export"],
  })
  .input(
    z.object({
      file: z.union([z.file(), z.array(z.file())]),
    }),
  )
  .handler(({ context, input, errors }) => {
    const files = Array.isArray(input.file) ? input.file : [input.file];
    return unwrapResult(ImportExportService.startImport(context, files), {
      NO_FILES: () => {
        throw errors.NO_FILES();
      },
      UPLOAD_FAILED: () => {
        throw errors.UPLOAD_FAILED();
      },
      WORKFLOW_CREATE_FAILED: () => {
        throw errors.WORKFLOW_CREATE_FAILED();
      },
    });
  });

const importProgress = adminProcedure
  .errors(importExportErrors)
  .route({
    method: "GET",
    path: "/admin/import/{taskId}",
    summary: "Get import task progress",
    tags: ["Admin Import Export"],
  })
  .input(GetProgressInputSchema)
  .output(TaskProgressSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(ImportExportService.getImportProgress(context, input.taskId), {
      TASK_NOT_FOUND: () => {
        throw errors.TASK_NOT_FOUND();
      },
      INVALID_PROGRESS_DATA: () => {
        throw errors.INVALID_PROGRESS_DATA();
      },
    }),
  );

export default {
  startExport,
  exportProgress,
  startImport,
  importProgress,
};
