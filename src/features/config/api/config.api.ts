import { createServerFn } from "@tanstack/react-start";
import * as ConfigService from "@/features/config/service/config.service";
import { adminMiddleware } from "@/lib/middlewares";
import { SystemConfigSchema } from "@/features/config/config.schema";

export const getSystemConfigFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => ConfigService.getSystemConfig(context));

export const updateSystemConfigFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(SystemConfigSchema)
  .handler(({ context, data }) =>
    ConfigService.updateSystemConfig(context, data),
  );
