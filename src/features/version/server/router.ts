import { versionChecker } from "@/features/version/service/version.service";
import { adminProcedure } from "@/lib/orpc/procedure";
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
  .handler(({ context, errors }) =>
    unwrapResult(versionChecker.refresh(context), {
      FETCH_FAILED: () => {
        throw errors.FETCH_FAILED();
      },
    }),
  );

export default {
  check,
  forceCheck,
};
