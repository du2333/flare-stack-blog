import { createFileRoute } from "@tanstack/react-router";
import { serverEnv } from "@/lib/env/server.env";

export const Route = createFileRoute("/api/send")({
  server: {
    handlers: {
      ANY: async ({ request, context }) => {
        const umamiSrc = serverEnv(context.env).UMAMI_SRC;
        if (!umamiSrc) {
          return new Response("Not Found", { status: 404 });
        }
        const sendUrl = new URL("/api/send", umamiSrc).toString();
        return fetch(sendUrl, request);
      },
    },
  },
});
