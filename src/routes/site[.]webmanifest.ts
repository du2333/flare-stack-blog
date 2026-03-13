import { createFileRoute } from "@tanstack/react-router";
import * as ConfigService from "@/features/config/service/config.service";
import { getDb } from "@/lib/db";

function buildManifest(
  site: Awaited<ReturnType<typeof ConfigService.getSiteConfig>>,
) {
  return {
    name: site.title,
    short_name: site.title,
    icons: [
      {
        src: site.icons.webApp192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: site.icons.webApp512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
}

export const Route = createFileRoute("/site.webmanifest")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const site = await ConfigService.getSiteConfig({
          env: context.env,
          db: getDb(context.env),
          executionCtx: context.executionCtx,
        });

        return new Response(JSON.stringify(buildManifest(site), null, 2), {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
      HEAD: async () => {
        return new Response(null, {
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
