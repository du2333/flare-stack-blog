import { createServerFn } from "@tanstack/react-start";
import * as VersionService from "./version.service";
import { adminMiddleware } from "@/lib/middlewares";

export const checkUpdateFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => VersionService.checkForUpdate(context));

export const forceCheckUpdateFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => VersionService.checkForUpdate(context, true));
