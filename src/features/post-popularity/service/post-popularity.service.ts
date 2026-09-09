import { invalidate } from "@/features/cache/public-cache";
import * as PostPopularityRepo from "@/features/post-popularity/data/post-popularity.data";
import {
  resolveUmamiApiConfig,
  umamiClient,
  type UmamiApiConfig,
} from "@/features/post-popularity/data/umami.client";
import {
  buildPostPopularitySnapshot,
  getPostPopularityWindow,
  isPostPopularitySnapshotUsable,
  POST_POPULARITY_MAX_AGE_MS,
  withViewCounts,
  type PostPopularityMetric,
  type PostPopularityWindow,
  type PublishedPostPopularityRef,
} from "@/features/post-popularity/post-popularity";
import {
  PostPopularitySyncStatusSchema,
  type PostPopularitySnapshot,
  type PostPopularityStatusRecord,
  type PostPopularitySyncStatus,
} from "@/features/post-popularity/post-popularity.schema";
import { popularPosts } from "@/features/posts/posts.cache";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { serverEnv } from "@/lib/env/server.env";
import type { Result } from "@/lib/errors";
import { err, ok } from "@/lib/errors";

type PopularityReadContext = DbContext & {
  executionCtx: ExecutionContext;
};

type SyncResult = Result<PostPopularitySyncStatus, { reason: "SYNC_FAILED" }>;

type Dependencies = {
  now: () => Date;
  resolveConfig: (env: Env) => UmamiApiConfig;
  getPathMetrics: (
    config: UmamiApiConfig,
    window: PostPopularityWindow,
  ) => Promise<PostPopularityMetric[]>;
  listPublishedPosts: (db: DB) => Promise<PublishedPostPopularityRef[]>;
  readSnapshot: (env: Env) => Promise<PostPopularitySnapshot | null>;
  writeSnapshot: (env: Env, snapshot: PostPopularitySnapshot) => Promise<void>;
  readStatus: (env: Env) => Promise<PostPopularityStatusRecord | null>;
  writeStatus: (env: Env, status: PostPopularityStatusRecord) => Promise<void>;
  invalidate: (
    context: DbContext & { executionCtx: ExecutionContext },
  ) => Promise<void>;
  getPopularPosts: (
    context: PopularityReadContext,
    params: {
      limit: number;
      snapshotVersion: number;
      postIds: number[];
    },
  ) => Promise<PostItem[]>;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toSyncStatus({
  configured,
  configError,
  snapshot,
  status,
  now,
}: {
  configured: boolean;
  configError: string | null;
  snapshot: PostPopularitySnapshot | null;
  status: PostPopularityStatusRecord | null;
  now: number;
}): PostPopularitySyncStatus {
  return PostPopularitySyncStatusSchema.parse({
    configured,
    expired: snapshot ? !isPostPopularitySnapshotUsable(snapshot, now) : false,
    postCount: snapshot?.entries.length ?? 0,
    lastAttemptAt: status?.lastAttemptAt ?? null,
    lastSuccessAt: status?.lastSuccessAt ?? snapshot?.syncedAt ?? null,
    expiresAt: snapshot?.syncedAt
      ? snapshot.syncedAt + POST_POPULARITY_MAX_AGE_MS
      : null,
    lastError: configError ?? status?.lastError ?? null,
    windowStart: snapshot?.windowStart ?? status?.windowStart ?? null,
    windowEnd: snapshot?.windowEnd ?? status?.windowEnd ?? null,
  });
}

export function createPostPopularityService(dependencies: Dependencies) {
  async function getStatus(context: BaseContext) {
    const now = dependencies.now().getTime();
    const [snapshot, status] = await Promise.all([
      dependencies.readSnapshot(context.env),
      dependencies.readStatus(context.env),
    ]);
    let configured = true;
    let configError: string | null = null;
    try {
      dependencies.resolveConfig(context.env);
    } catch (error) {
      configured = false;
      configError = errorMessage(error);
    }

    return toSyncStatus({
      configured,
      configError,
      snapshot,
      status,
      now,
    });
  }

  async function sync(
    context: DbContext & { executionCtx: ExecutionContext },
  ): Promise<SyncResult> {
    const now = dependencies.now();
    const attemptedAt = now.getTime();
    const window = getPostPopularityWindow(now);
    const previousStatus = await dependencies.readStatus(context.env);
    let snapshotWritten = false;

    try {
      const config = dependencies.resolveConfig(context.env);
      const [metrics, posts] = await Promise.all([
        dependencies.getPathMetrics(config, window),
        dependencies.listPublishedPosts(context.db),
      ]);
      const snapshot = buildPostPopularitySnapshot({
        metrics,
        posts,
        window,
        syncedAt: attemptedAt,
      });
      await dependencies.writeSnapshot(context.env, snapshot);
      snapshotWritten = true;
      await dependencies.invalidate(context);
      const status = {
        lastAttemptAt: attemptedAt,
        lastSuccessAt: attemptedAt,
        lastError: null,
        windowStart: window.startAt,
        windowEnd: window.endAt,
      } satisfies PostPopularityStatusRecord;
      await dependencies.writeStatus(context.env, status);
      return ok(
        toSyncStatus({
          configured: true,
          configError: null,
          snapshot,
          status,
          now: attemptedAt,
        }),
      );
    } catch (error) {
      const message = errorMessage(error);
      console.error(
        JSON.stringify({
          message: "post popularity sync failed",
          error: message,
        }),
      );
      await dependencies
        .writeStatus(context.env, {
          lastAttemptAt: attemptedAt,
          lastSuccessAt: snapshotWritten
            ? attemptedAt
            : (previousStatus?.lastSuccessAt ?? null),
          lastError: message,
          windowStart: window.startAt,
          windowEnd: window.endAt,
        })
        .catch((statusError) =>
          console.error(
            JSON.stringify({
              message: "post popularity status write failed",
              error: errorMessage(statusError),
            }),
          ),
        );
      return err({ reason: "SYNC_FAILED" });
    }
  }

  async function getPopular(
    context: PopularityReadContext,
    limit = 5,
  ): Promise<PostItem[]> {
    const snapshot = await dependencies.readSnapshot(context.env);
    if (
      !snapshot ||
      !isPostPopularitySnapshotUsable(snapshot, dependencies.now().getTime())
    ) {
      return [];
    }

    const posts = await dependencies.getPopularPosts(context, {
      limit,
      snapshotVersion: snapshot.syncedAt,
      postIds: snapshot.entries.map((entry) => entry.postId),
    });
    return withViewCounts(posts, snapshot, dependencies.now().getTime());
  }

  async function attachViewCounts<T extends { id: number }>(
    context: BaseContext,
    posts: T[],
  ): Promise<Array<T & { viewCount?: number }>> {
    const snapshot = await dependencies.readSnapshot(context.env);
    return withViewCounts(posts, snapshot, dependencies.now().getTime());
  }

  return { getStatus, sync, getPopular, attachViewCounts };
}

export const postPopularityService = createPostPopularityService({
  now: () => new Date(),
  resolveConfig: (env) => resolveUmamiApiConfig(serverEnv(env)),
  getPathMetrics: (config, window) =>
    umamiClient.getPathMetrics(config, window),
  listPublishedPosts: PostPopularityRepo.listPublishedPosts,
  readSnapshot: PostPopularityRepo.readSnapshot,
  writeSnapshot: PostPopularityRepo.writeSnapshot,
  readStatus: PostPopularityRepo.readStatus,
  writeStatus: PostPopularityRepo.writeStatus,
  invalidate: (context) => invalidate.postPopularityUpdated(context),
  getPopularPosts: (context, params) => popularPosts.get(context, params),
});
