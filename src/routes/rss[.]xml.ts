import { createFileRoute } from "@tanstack/react-router";
import { buildFeed } from "@/features/posts/utils/feed";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const feed = await buildFeed(context.env, context.executionCtx);

        return new Response(feed.rss2(), {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
