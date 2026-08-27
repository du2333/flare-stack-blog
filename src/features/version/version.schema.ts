import { z } from "zod";

export const ApplicationReleaseVersionSchema = z
  .string()
  .regex(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

export const RunningApplicationReleaseVersionSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);

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
} as const;
