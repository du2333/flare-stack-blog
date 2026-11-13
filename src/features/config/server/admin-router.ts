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
} from "@/features/config/utils/site-icon";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

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

const uploadIcon = adminProcedure
  .errors({
    SITE_ICON_INVALID: {
      status: 400,
      message: "The site icon was refused; the saved icons are unchanged.",
      data: z.object({
        detail: z
          .enum(SITE_ICON_DETAILS)
          .describe(
            `Why. UNSUPPORTED_TYPE: the bytes are not a PNG or a JPEG. NOT_SQUARE: width and height differ. TOO_SMALL: narrower than ${SITE_ICON_MIN_SIZE} px. UNREADABLE: the image could not be read.`,
          ),
        width: z.number().optional(),
        height: z.number().optional(),
      }),
    },
  })
  .route({
    method: "POST",
    path: "/admin/config/assets/icon",
    summary: "Upload the site icon",
    description: `Takes one square PNG or JPEG of at least ${SITE_ICON_MIN_SIZE}×${SITE_ICON_MIN_SIZE} and stores it as the site's raster icons: PNGs of ${SITE_ICON_SIZES.map((target) => target.size).join(", ")} px, made at upload. Returns their addresses for config.site.icons (favicon96, appleTouchIcon, webApp192, webApp512); save them with PATCH /admin/config. resized is false when the sizes could not be made (for example, the image transform quota is used up) and each address holds the original file. The vector tab icon is a separate SVG, uploaded with POST /admin/config/assets to ${SITE_ICON_SVG_PATH}. Answers 400 SITE_ICON_INVALID when the image is refused; data.detail says why.`,
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
      icons: z.object({
        favicon96: z.string(),
        appleTouchIcon: z.string(),
        webApp192: z.string(),
        webApp512: z.string(),
      }),
      resized: z
        .boolean()
        .describe(
          "False when the sizes could not be made and every address holds the original file.",
        ),
    }),
  )
  .handler(({ context, input, errors }) => {
    const invalid = (
      detail: (typeof SITE_ICON_DETAILS)[number],
      size: { width?: number; height?: number } = {},
    ) => errors.SITE_ICON_INVALID({ data: { detail, ...size } });
    return unwrapResult(
      ConfigService.uploadSiteIcon(context, { file: input.file }),
      {
        SITE_ICON_UNSUPPORTED_TYPE: () => {
          throw invalid("UNSUPPORTED_TYPE");
        },
        SITE_ICON_NOT_SQUARE: ({ width, height }) => {
          throw invalid("NOT_SQUARE", { width, height });
        },
        SITE_ICON_TOO_SMALL: ({ width, height }) => {
          throw invalid("TOO_SMALL", { width, height });
        },
        SITE_ICON_UNREADABLE: () => {
          throw invalid("UNREADABLE");
        },
      },
    );
  });

export default {
  get: getSystem,
  update: updateSystem,
  uploadAsset,
  uploadIcon,
};
