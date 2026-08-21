import { z } from "zod";
import * as PageviewService from "@/features/pageview/service/pageview.service";
import { sha256 } from "@/features/pageview/utils/hash";
import { serverEnv } from "@/lib/env/server.env";
import { publicProcedure } from "@/lib/orpc/procedure";

const record = publicProcedure
  .route({
    method: "POST",
    path: "/pageviews",
    summary: "Record a post page view",
    tags: ["Pageviews"],
  })
  .input(z.object({ postId: z.number().int().positive() }))
  .handler(async ({ context, input }) => {
    const ip = context.headers.get("cf-connecting-ip") || "";
    const ua = context.headers.get("user-agent") || "";
    const salt = serverEnv(context.env).PAGEVIEW_SALT || "";
    const visitorHash = await sha256(`${ip}:${ua}:${salt}`);

    context.executionCtx.waitUntil(
      context.env.QUEUE.send({
        type: "PAGEVIEW",
        data: { postId: input.postId, visitorHash },
      }),
    );

    return { success: true };
  });

const counts = publicProcedure
  .route({
    method: "GET",
    path: "/pageviews",
    summary: "Get view counts by slug",
    tags: ["Pageviews"],
  })
  .input(z.object({ slugs: z.array(z.string()).max(50) }))
  .handler(({ context, input }) =>
    PageviewService.getViewCounts(context, input.slugs),
  );

export default {
  record,
  counts,
};
