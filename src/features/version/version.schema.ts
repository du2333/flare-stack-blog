import { z } from "zod";

// The release versions the update check reads and compares. This module holds
// no server-only code, so any module may import it; the update check's result
// lives in update-check.schema.ts, which is server only.

export const ApplicationReleaseVersionSchema = z
  .string()
  .regex(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

// The running build may be a prerelease (`3.13.0-beta.0`); the latest release
// read from upgrades.json or the release page stays a plain `vX.Y.Z`.
export const RunningApplicationReleaseVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/,
  );

export const ApplicationReleaseSchema = z.object({
  version: ApplicationReleaseVersionSchema,
  releaseUrl: z.url(),
});

export type ApplicationRelease = z.infer<typeof ApplicationReleaseSchema>;

export const VERSION_CACHE_KEYS = {
  latestRelease: ["version", "latest-release"] as const,
  recentFailure: ["version", "recent-failure"] as const,
} as const;
