import { createFileRoute } from "@tanstack/react-router";
import * as ConfigService from "@/features/config/service/config.service";
import { getDb } from "@/lib/db";

function buildManifest(name: string) {
  return {
    name,
    short_name: name,
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
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

        return new Response(
          JSON.stringify(buildManifest(site.title || "Blog"), null, 2),
          {
            headers: {
              "Content-Type": "application/manifest+json; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
          },
        );
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
