import { z } from "zod";

export const ApplicationReleaseVersionSchema = z
  .string()
  .regex(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

// The running build may be a prerelease (`3.13.0-beta.0`); the latest release
// read from the release page stays a plain `vX.Y.Z`.
export const RunningApplicationReleaseVersionSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/,
  );

export const ApplicationReleaseSchema = z.object({
  version: ApplicationReleaseVersionSchema,
  releaseUrl: z.url(),
});

export const UpdateCheckResultSchema = z.object({
  latestVersion: ApplicationReleaseVersionSchema,
  currentVersion: RunningApplicationReleaseVersionSchema,
  hasUpdate: z.boolean(),
  releaseUrl: z.url(),
});

export const GitHubReleaseSchema = z.object({
  tag_name: ApplicationReleaseVersionSchema,
  html_url: z.url(),
});

export type ApplicationRelease = z.infer<typeof ApplicationReleaseSchema>;
export type UpdateCheckResult = z.infer<typeof UpdateCheckResultSchema>;

export const VERSION_CACHE_KEYS = {
  latestRelease: ["version", "latest-release"] as const,
  recentFailure: ["version", "recent-failure"] as const,
} as const;
