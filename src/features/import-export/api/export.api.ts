import { createServerFn } from "@tanstack/react-start";
import {
  GetProgressInputSchema,
  StartExportInputSchema,
} from "@/features/import-export/import-export.schema";
import * as ImportExportService from "@/features/import-export/import-export.service";
import { adminMiddleware } from "@/lib/middlewares";

export const startExportFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(StartExportInputSchema)
  .handler(async ({ data, context }) => {
    console.log(
      JSON.stringify({
        event: "import_export.start_export.request",
        postIds: data.postIds,
        status: data.status,
      }),
    );
    const result = await ImportExportService.startExport(context, data);
    if (result.error) {
      console.error(
        JSON.stringify({
          event: "import_export.start_export.error",
          reason: result.error.reason,
        }),
      );
      switch (result.error.reason) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        case "WORKFLOW_CREATE_FAILED":
          throw new Error("启动导出任务失败");
        default:
          result.error.reason satisfies never;
          throw new Error("未知错误");
      }
    }
    console.log(
      JSON.stringify({
        event: "import_export.start_export.success",
        taskId: result.data.taskId,
      }),
    );
    return result.data;
  });

export const getExportProgressFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetProgressInputSchema)
  .handler(async ({ data, context }) => {
    console.log(
      JSON.stringify({
        event: "import_export.get_export_progress.request",
        taskId: data.taskId,
      }),
    );
    const result = await ImportExportService.getExportProgress(
      context,
      data.taskId,
    );
    console.log(
      JSON.stringify({
        event: "import_export.get_export_progress.success",
        taskId: data.taskId,
      }),
    );
    return result;
  });
