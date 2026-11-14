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
import {
  SITE_ICON_ACCEPTED_TYPES,
  SITE_ICON_MIN_SIZE,
  SITE_ICON_SIZES,
  SITE_ICON_SVG_PATH,
  type SiteIconField,
} from "@/features/config/utils/site-icon";
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

const SITE_ICON_DETAILS = [
  "UNSUPPORTED_TYPE",
  "NOT_SQUARE",
  "TOO_SMALL",
  "UNREADABLE",
] as const;

const siteIconErrors = {
  SITE_ICON_INVALID: {
    status: 400,
    message: "The site icon was refused; nothing was stored.",
    data: z.object({
      detail: z
        .enum(SITE_ICON_DETAILS)
        .describe(
          `Why. UNSUPPORTED_TYPE: the bytes are not a PNG or a JPEG. NOT_SQUARE: width and height differ. TOO_SMALL: narrower than ${SITE_ICON_MIN_SIZE} px. UNREADABLE: the image could not be read.`,
        ),
      width: z.number().int().optional().describe("The image's width in px."),
      height: z.number().int().optional().describe("The image's height in px."),
    }),
  },
  SITE_ICON_STORE_FAILED: {
    status: 500,
    message:
      "The site icon could not be stored. Upload it again; the saved config is unchanged.",
  },
} as const;

// One address per size an upload makes, named as in config.site.icons.
const siteIconAddresses = z.object(
  Object.fromEntries(
    SITE_ICON_SIZES.map(({ field, size }) => [
      field,
      z.string().describe(`The ${size}×${size} icon's address.`),
    ]),
  ) as Record<SiteIconField, z.ZodString>,
);

const uploadIcon = adminProcedure
  .errors(siteIconErrors)
  .route({
    method: "POST",
    path: "/admin/config/assets/icon",
    summary: "Upload the site icon",
    description: `Takes one square PNG or JPEG of at least ${SITE_ICON_MIN_SIZE}×${SITE_ICON_MIN_SIZE} and makes the site's raster icons from it: PNGs of ${SITE_ICON_SIZES.map((target) => target.size).join(", ")} px. The files at their fixed object-storage paths are replaced at upload, before any config is saved; discarding an unsaved settings draft does not revert them. Returns their addresses for config.site.icons; save them with PATCH /admin/config. resized is false when the sizes could not be made (for example, the image transform quota is used up) and each address holds the original file. The vector tab icon is a separate SVG, uploaded with POST /admin/config/assets to ${SITE_ICON_SVG_PATH}. Answers 400 SITE_ICON_INVALID when the image is refused, with data.detail saying why, and nothing is stored.`,
    tags: ["Admin Config"],
  })
  .input(
    z.strictObject({
      file: z
        .file()
        .max(SITE_ASSET_MAX_FILE_SIZE)
        .mime([...SITE_ICON_ACCEPTED_TYPES]),
    }),
  )
  .output(
    z.object({
      icons: siteIconAddresses,
      resized: z
        .boolean()
        .describe(
          "False when the sizes could not be made and every address holds the original file.",
        ),
    }),
  )
  .handler(async ({ context, input, errors }) => {
    const result = await ConfigService.uploadSiteIcon(context, {
      file: input.file,
    });
    if (!result.error) return result.data;
    const error = result.error;
    switch (error.reason) {
      case "SITE_ICON_UNSUPPORTED_TYPE":
        throw errors.SITE_ICON_INVALID({
          data: { detail: "UNSUPPORTED_TYPE" },
        });
      case "SITE_ICON_UNREADABLE":
        throw errors.SITE_ICON_INVALID({ data: { detail: "UNREADABLE" } });
      case "SITE_ICON_NOT_SQUARE":
        throw errors.SITE_ICON_INVALID({
          data: {
            detail: "NOT_SQUARE",
            width: error.width,
            height: error.height,
          },
        });
      case "SITE_ICON_TOO_SMALL":
        throw errors.SITE_ICON_INVALID({
          data: {
            detail: "TOO_SMALL",
            width: error.width,
            height: error.height,
          },
        });
      case "SITE_ICON_STORE_FAILED":
        throw errors.SITE_ICON_STORE_FAILED();
      default:
        error satisfies never;
        throw new Error("Unknown site icon error");
    }
  });

export default {
  get: getSystem,
  update: updateSystem,
  uploadAsset,
  uploadIcon,
};
