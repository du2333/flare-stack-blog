import { defineEntry } from "@/features/cache/public-cache";
import * as MomentRepo from "@/features/moments/data/moments.data";
import {
  LatestMomentsSchema,
  MomentListResponseSchema,
  PublicMomentSchema,
} from "@/features/moments/schema/moments.schema";
import { toPublicMoment } from "@/features/moments/utils/public-moment";
import {
  LATEST_MOMENTS_COUNT,
  MOMENTS_PER_PAGE,
} from "@/features/moments/utils/moment-rules";

// Every write to a Moment can move every list page, so the list namespace is
// bumped as a whole; a Moment's own entry is deleted by its id.

export const momentsPage = defineEntry({
  name: "moments.list",
  namespace: "moments:list",
  key: ({ page }: { page: number }) => ["moments", "list", page],
  schema: MomentListResponseSchema,
  ttl: "7d",
  invalidatedBy: ["moment.changed"],
  load: async (context, { page: requestedPage }) => {
    const total = await MomentRepo.countMoments(context.db);
    const totalPages = Math.max(1, Math.ceil(total / MOMENTS_PER_PAGE));
    const page = Math.min(requestedPage, totalPages);
    const rows = await MomentRepo.findMoments(context.db, {
      limit: MOMENTS_PER_PAGE,
      offset: (page - 1) * MOMENTS_PER_PAGE,
    });
    return { items: rows.map(toPublicMoment), page, totalPages };
  },
});

export const momentById = defineEntry({
  name: "moments.detail",
  namespace: "moments:detail",
  address: ["id"],
  key: ({ id }: { id: number }) => ["moment", id],
  // A Moment that does not exist loads as null, which is not stored.
  schema: PublicMomentSchema.nullable(),
  ttl: "7d",
  invalidatedBy: ["moment.changed"],
  load: async (context, { id }) => {
    const row = await MomentRepo.findMomentById(context.db, id);
    return row ? toPublicMoment(row) : null;
  },
});

// Also tells the public layout whether any Moment exists, so every page's
// navigation reads one small entry.
export const latestMoments = defineEntry({
  name: "moments.latest",
  key: (_params: Record<string, never>) => ["moments", "latest"],
  schema: LatestMomentsSchema,
  ttl: "7d",
  invalidatedBy: ["moment.changed"],
  load: async (context) => {
    const rows = await MomentRepo.findMoments(context.db, {
      limit: LATEST_MOMENTS_COUNT,
    });
    return rows.map(toPublicMoment);
  },
});
