import { z } from "zod";
import {
  SITE_ASSET_ACCEPTED_TYPES,
  SITE_ASSET_MAX_FILE_SIZE,
  parseSiteAssetUploadInput,
} from "@/features/config/config.asset.schema";
import { SystemConfigSchema } from "@/features/config/config.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { serverEnv } from "@/lib/env/server.env";
import { m } from "@/paraglide/messages";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";

const siteConfig = publicProcedure
  .route({
    method: "GET",
    path: "/site/config",
    summary: "Get public site config",
    tags: ["Site"],
  })
  .handler(({ context }) => ConfigService.getSiteConfig(context));

const siteDomain = publicProcedure
  .route({
    method: "GET",
    path: "/site/domain",
    summary: "Get the public site domain",
    tags: ["Site"],
  })
  .handler(({ context }) => serverEnv(context.env).DOMAIN);

const getSystem = adminProcedure
  .route({
    method: "GET",
    path: "/admin/config",
    summary: "Get system config",
    tags: ["Admin Config"],
  })
  .handler(({ context }) => ConfigService.getSystemConfig(context));

const updateSystem = adminProcedure
  .route({
    method: "PATCH",
    path: "/admin/config",
    summary: "Update system config",
    tags: ["Admin Config"],
  })
  .input(SystemConfigSchema)
  .handler(({ context, input }) =>
    ConfigService.updateSystemConfig(context, input),
  );

const uploadAsset = adminProcedure
  .route({
    method: "POST",
    path: "/admin/config/assets",
    summary: "Upload a site asset",
    tags: ["Admin Config"],
  })
  .input(
    z.object({
      file: z
        .file()
        .max(SITE_ASSET_MAX_FILE_SIZE)
        .mime([...SITE_ASSET_ACCEPTED_TYPES]),
      assetPath: z.string().min(1),
    }),
  )
  .handler(({ context, input }) => {
    const formData = new FormData();
    formData.set("file", input.file);
    formData.set("assetPath", input.assetPath);
    const parsed = parseSiteAssetUploadInput(formData, m);
    return ConfigService.uploadSiteAsset(context, parsed);
  });

export default {
  siteConfig,
  siteDomain,
  admin: {
    get: getSystem,
    update: updateSystem,
    uploadAsset,
  },
};
