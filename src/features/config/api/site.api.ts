import { createServerFn } from "@tanstack/react-start";
import * as ConfigService from "@/features/config/service/config.service";
import { serverEnv } from "@/lib/env/server.env";
import { dbMiddleware } from "@/lib/middlewares";

export const getSiteDomainFn = createServerFn().handler(({ context }) => {
  return serverEnv(context.env).DOMAIN;
});

export const getSiteConfigFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => ConfigService.getSiteConfig(context));
