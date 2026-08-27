import { PostPopularitySyncStatusSchema } from "@/features/post-popularity/post-popularity.schema";
import { postPopularityService } from "@/features/post-popularity/service/post-popularity.service";
import { adminProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const postPopularityErrors = {
  SYNC_FAILED: { status: 502, message: "Failed to sync post popularity." },
} as const;

const status = adminProcedure
  .route({
    method: "GET",
    path: "/admin/post-popularity",
    summary: "Get post popularity sync status",
    tags: ["Admin Post Popularity"],
  })
  .output(PostPopularitySyncStatusSchema)
  .handler(({ context }) => postPopularityService.getStatus(context));

const sync = adminProcedure
  .errors(postPopularityErrors)
  .route({
    method: "POST",
    path: "/admin/post-popularity/sync",
    summary: "Sync post popularity from Umami",
    tags: ["Admin Post Popularity"],
  })
  .output(PostPopularitySyncStatusSchema)
  .handler(({ context, errors }) =>
    unwrapResult(postPopularityService.sync(context), {
      SYNC_FAILED: () => {
        throw errors.SYNC_FAILED();
      },
    }),
  );

export default { status, sync };
