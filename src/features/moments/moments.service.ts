import * as CacheService from "@/features/cache/cache.service";
import { CACHE_NAMESPACES } from "@/features/cache/types";
import { err, ok } from "@/lib/errors";
import { purgeCDNCache } from "@/lib/invalidate";
import * as MomentRepo from "./data/moments.data";
import {
  CreateMomentInputSchema,
  MOMENTS_CACHE_KEYS,
  type CreateMomentInput,
  type DeleteMomentInput,
  type GetAdminMomentsInput,
  type GetMomentsInput,
  MomentsListResponseSchema,
  type UpdateMomentInput,
} from "./moments.schema";

function normalizeLocation(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function invalidateCache(context: DbContext & { executionCtx: ExecutionContext }) {
  context.executionCtx.waitUntil(
    Promise.all([
      CacheService.bumpVersion(context, CACHE_NAMESPACES.MOMENTS_LIST),
      purgeCDNCache(context.env, { urls: ["/moments"] }),
    ]),
  );
}

export async function getMoments(
  context: DbContext & { executionCtx: ExecutionContext },
  data: GetMomentsInput,
) {
  const version = await CacheService.getVersion(
    context,
    CACHE_NAMESPACES.MOMENTS_LIST,
  );
  const cacheKey = MOMENTS_CACHE_KEYS.list(version, data.limit);

  return await CacheService.get(
    context,
    cacheKey,
    MomentsListResponseSchema,
    async () => {
      const result = await MomentRepo.getPublishedMoments(context.db, {
        limit: data.limit,
      });
      return MomentsListResponseSchema.parse(result);
    },
    { ttl: "1h" },
  );
}

export async function getAdminMoments(
  context: DbContext,
  data: GetAdminMomentsInput,
) {
  const result = await MomentRepo.getAdminMoments(context.db, data);
  return MomentsListResponseSchema.parse(result);
}

export async function createMoment(
  context: DbContext & { executionCtx: ExecutionContext },
  data: CreateMomentInput,
) {
  const input = CreateMomentInputSchema.parse(data);
  const moment = await MomentRepo.insertMoment(context.db, {
    type: input.type,
    content: input.content,
    images: input.images,
    location: normalizeLocation(input.location),
    publishedAt: input.publishedAt ?? new Date(),
  });

  invalidateCache(context);
  return moment;
}

export async function updateMoment(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdateMomentInput,
) {
  const existing = await MomentRepo.findMomentById(context.db, data.id);
  if (!existing) {
    return err({ reason: "NOT_FOUND" });
  }

  const { id, ...values } = data;
  const moment = await MomentRepo.updateMoment(context.db, id, {
    ...(values.type !== undefined ? { type: values.type } : {}),
    ...(values.content !== undefined ? { content: values.content } : {}),
    ...(values.images !== undefined ? { images: values.images } : {}),
    ...(values.location !== undefined
      ? { location: normalizeLocation(values.location) }
      : {}),
    ...(values.publishedAt !== undefined
      ? { publishedAt: values.publishedAt }
      : {}),
  });

  invalidateCache(context);
  return ok(moment);
}

export async function deleteMoment(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteMomentInput,
) {
  const existing = await MomentRepo.findMomentById(context.db, data.id);
  if (!existing) {
    return err({ reason: "NOT_FOUND" });
  }

  await MomentRepo.softDeleteMoment(context.db, data.id);
  invalidateCache(context);
  return ok({ success: true });
}
