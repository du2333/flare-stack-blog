import { lazy } from "@orpc/server";
import {
  LatestMomentsSchema,
  MomentIdInputSchema,
  MomentListInputSchema,
  MomentListResponseSchema,
  MomentsExistSchema,
  PublicMomentSchema,
} from "@/features/moments/schema/moments.schema";
import * as MomentService from "@/features/moments/services/moments.service";
import {
  LATEST_MOMENTS_COUNT,
  MOMENTS_PER_PAGE,
} from "@/features/moments/utils/moment-rules";
import { publicProcedure } from "@/lib/orpc/procedure";

const list = publicProcedure
  .route({
    method: "GET",
    path: "/moments",
    summary: "List moments",
    description: `Lists the Moments newest first, by when they were posted, ${MOMENTS_PER_PAGE} a page. A page past the last answers the last page; page says which was answered, and totalPages how many there are (1 when there are no Moments).`,
    tags: ["Moments"],
  })
  .input(MomentListInputSchema)
  .output(MomentListResponseSchema)
  .handler(({ context, input }) =>
    MomentService.getMomentsPage(context, input.page),
  );

const latest = publicProcedure
  .route({
    method: "GET",
    path: "/moments/latest",
    summary: "List the latest moments",
    description: `The ${LATEST_MOMENTS_COUNT} newest Moments, as the home page sidebar shows them; an empty list when there are none.`,
    tags: ["Moments"],
  })
  .output(LatestMomentsSchema)
  .handler(({ context }) => MomentService.getLatestMoments(context));

const exists = publicProcedure
  .route({
    method: "GET",
    path: "/moments/exists",
    summary: "Tell whether any moment exists",
    description:
      "The public navigation and the home page show Moments only once at least one exists.",
    tags: ["Moments"],
  })
  .output(MomentsExistSchema)
  .handler(async ({ context }) => ({
    exists: await MomentService.momentsExist(context),
  }));

const byId = publicProcedure
  .errors({
    MOMENT_NOT_FOUND: { status: 404, message: "Moment not found." },
  })
  .route({
    method: "GET",
    path: "/moments/{id}",
    summary: "Get a moment by id",
    description:
      "Returns the Moment, or answers 404 MOMENT_NOT_FOUND when there is none, such as one that was deleted.",
    tags: ["Moments"],
  })
  .input(MomentIdInputSchema)
  .output(PublicMomentSchema)
  .handler(async ({ context, input, errors }) => {
    const moment = await MomentService.getMomentById(context, input.id);
    if (!moment) throw errors.MOMENT_NOT_FOUND();
    return moment;
  });

export default {
  list,
  latest,
  exists,
  byId,
  // Loaded on the first request under the prefix; public calls never load it.
  admin: lazy(() => import("./admin-router"), { prefix: "/admin/moments" }),
};
