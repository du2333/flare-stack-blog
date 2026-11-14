import * as DismissedUpdateService from "@/features/version/service/dismissed-update.service";
import { versionChecker } from "@/features/version/service/version.service";
import * as UpgradeNoticeService from "@/features/version/service/upgrade-notice.service";
import {
  DismissUpdateInputSchema,
  UpdateCheckResultSchema,
} from "@/features/version/update-check.schema";
import { UpgradeNoticeResultSchema } from "@/features/version/upgrade-notice.schema";
import { adminProcedure, browserAdminProcedure } from "@/lib/orpc/procedure";
import { SuccessResponseSchema } from "@/lib/orpc/success-schema";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const versionErrors = {
  FETCH_FAILED: { status: 502, message: "Failed to check for updates." },
} as const;

const check = adminProcedure
  .errors(versionErrors)
  .route({
    method: "GET",
    path: "/admin/version",
    summary: "Check for application updates",
    tags: ["Admin Version"],
  })
  .output(UpdateCheckResultSchema)
  .handler(({ context, errors }) =>
    unwrapResult(versionChecker.check(context), {
      FETCH_FAILED: () => {
        throw errors.FETCH_FAILED();
      },
    }),
  );

const forceCheck = adminProcedure
  .errors(versionErrors)
  .route({
    method: "POST",
    path: "/admin/version/check",
    summary: "Force-check for application updates",
    tags: ["Admin Version"],
  })
  .output(UpdateCheckResultSchema)
  .handler(({ context, errors }) =>
    unwrapResult(versionChecker.refresh(context), {
      FETCH_FAILED: () => {
        throw errors.FETCH_FAILED();
      },
    }),
  );

// The notice after an upgrade is for the Admin who signed in to the site. An
// API Key cannot read it or acknowledge it, and the API document leaves both out.

const upgradeNotice = browserAdminProcedure
  .route({
    method: "GET",
    path: "/admin/version/upgrade-notice",
    summary: "Read the notice shown after an upgrade",
    description:
      "The upgrade notes between the version last acknowledged and the running one. On the first read with no record it records the running version and returns no notice.",
    tags: ["Admin Version"],
  })
  .output(UpgradeNoticeResultSchema)
  .handler(({ context }) => UpgradeNoticeService.readUpgradeNotice(context));

const acknowledgeUpgrade = browserAdminProcedure
  .route({
    method: "POST",
    path: "/admin/version/upgrade-notice/acknowledge",
    summary: "Acknowledge the upgrade to the running version",
    tags: ["Admin Version"],
  })
  .output(SuccessResponseSchema)
  .handler(({ context }) =>
    UpgradeNoticeService.acknowledgeUpgradeNotice(context),
  );

// Silencing the notice is for the Admin who signed in to the site; an API Key
// cannot, and the API document leaves the operation out.

const dismissUpdate = browserAdminProcedure
  .errors({
    ...versionErrors,
    NOT_LATEST: {
      status: 409,
      message: "That version is not the latest release.",
    },
  })
  .route({
    method: "POST",
    path: "/admin/version/dismissed",
    summary:
      "Stop being reminded of the latest version, or restore the reminder",
    description:
      "Takes the latest version the check reports, or null to restore. Any other version is refused.",
    tags: ["Admin Version"],
  })
  .input(DismissUpdateInputSchema)
  .output(SuccessResponseSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(
      DismissedUpdateService.dismissUpdate(
        context,
        input.version,
        versionChecker.check,
      ),
      {
        FETCH_FAILED: () => {
          throw errors.FETCH_FAILED();
        },
        NOT_LATEST: () => {
          throw errors.NOT_LATEST();
        },
      },
    ),
  );

export default {
  check,
  forceCheck,
  dismissUpdate,
  upgradeNotice,
  acknowledgeUpgrade,
};
