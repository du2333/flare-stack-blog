import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GetProgressInputSchema } from "@/features/import-export/import-export.schema";
import * as ImportExportService from "@/features/import-export/import-export.service";
import { adminMiddleware } from "@/lib/middlewares";

const UploadForImportInputSchema = z.instanceof(FormData);

export const uploadForImportFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UploadForImportInputSchema)
  .handler(async ({ data: formData, context }) => {
    const files = formData
      .getAll("file")
      .filter((f): f is File => f instanceof File);

    const result = await ImportExportService.startImport(context, files);
    if (result.error) {
      switch (result.error.reason) {
        case "NO_FILES":
          throw new Error("缺少文件");
        case "UPLOAD_FAILED":
          throw new Error("上传文件失败，请重试");
        case "WORKFLOW_CREATE_FAILED":
          throw new Error("启动导入任务失败");
        default:
          result.error.reason satisfies never;
          throw new Error("未知错误");
      }
    }

    return result.data;
  });

export const getImportProgressFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetProgressInputSchema)
  .handler(({ data, context }) =>
    ImportExportService.getImportProgress(context, data.taskId),
  );
