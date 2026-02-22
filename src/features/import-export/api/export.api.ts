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
    const result = await ImportExportService.startExport(context, data);
    if (result.error) {
      switch (result.error.reason) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        case "WORKFLOW_CREATE_FAILED":
          throw new Error("启动导出任务失败");
        default:
          result.error.reason satisfies never;
          throw new Error("未知错误");
      }
    }
    return result.data;
  });

export const getExportProgressFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetProgressInputSchema)
  .handler(({ data, context }) =>
    ImportExportService.getExportProgress(context, data.taskId),
  );
