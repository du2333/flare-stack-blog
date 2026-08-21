import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/lib/env/server.env";

export const Route = createFileRoute("/stats.js")({
  server: {
    handlers: {
      GET: async ({ context }) => {
        const umamiSrc = serverEnv(context.env).UMAMI_SRC;
        if (!umamiSrc) {
          return new Response("Not Found", { status: 404 });
        }

        const scriptUrl = new URL("/script.js", umamiSrc).toString();
        const response = await fetch(scriptUrl);
        const headers = new Headers(response.headers);
        headers.set(
          "Cache-Control",
          "public, max-age=3600, stale-while-revalidate=86400",
        );
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      },
    },
  },
});
