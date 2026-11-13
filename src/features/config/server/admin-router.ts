import { z } from "zod";
import {
  SITE_ASSET_ACCEPTED_TYPES,
  SITE_ASSET_MAX_FILE_SIZE,
  parseSiteAssetUploadInput,
} from "@/features/config/config.asset.schema";
import {
  UpdateConfigSectionSchema,
  AdminConfigSnapshotSchema,
  CONFIG_ERRORS,
} from "@/features/config/config.admin.schema";
import * as ConfigService from "@/features/config/service/config.service";
import { adminProcedure } from "@/lib/orpc/procedure";

const getSystem = adminProcedure
  .errors(CONFIG_ERRORS)
  .output(AdminConfigSnapshotSchema)
  .route({
    method: "GET",
    path: "/admin/config",
    summary: "Get system config",
    description:
      "Returns a fresh database snapshot with redacted secrets and independent site/notification revisions. Internal runtime and public Site Config formats are unchanged.",
    tags: ["Admin Config"],
  })
  .handler(({ context }) => ConfigService.getAdminConfig(context));

const updateSystem = adminProcedure
  .errors(CONFIG_ERRORS)
  .output(AdminConfigSnapshotSchema)
  .route({
    method: "PATCH",
    path: "/admin/config",
    summary: "Update system config",
    description:
      "Replaces only the named section and preserves the other section. Read GET /admin/config first and submit the selected section revision; unversioned legacy writes are rejected. A site update replaces the whole Site Config: omitted fields, including theme.id, the Theme options and the shared bannerImage, bannerFocus, avatar, primaryHue, brandMark and tagline, return to their defaults, so normally submit the complete returned config.site. Notification updates include email, rules and explicit keep/replace/clear secret actions. Same-section conflicts return 409; refetch and reconcile the draft rather than blindly retrying.",
    tags: ["Admin Config"],
  })
  .input(UpdateConfigSectionSchema)
  .handler(({ context, input }) =>
    ConfigService.updateSystemConfig(context, input),
  );

const uploadAsset = adminProcedure
  .route({
    method: "POST",
    path: "/admin/config/assets",
    summary: "Upload a site asset",
    description:
      "Uploads immediately to the selected object-storage path. Discarding an unsaved settings draft does not revert uploaded image content.",
    tags: ["Admin Config"],
  })
  .output(
    z.object({
      url: z
        .string()
        .describe(
          "Public URL of the uploaded asset, with a version query that busts caches.",
        ),
    }),
  )
  .input(
    z.strictObject({
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
    const parsed = parseSiteAssetUploadInput(formData);
    return ConfigService.uploadSiteAsset(context, parsed);
  });

export default {
  get: getSystem,
  update: updateSystem,
  uploadAsset,
};
