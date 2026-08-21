import { createFileRoute } from "@tanstack/react-router";
import { handleImageRequest } from "@/features/media/service/media.service";

export const Route = createFileRoute("/images/$")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const key = new URL(request.url).pathname.slice("/images/".length);
        if (!key) {
          return new Response("Image key is required", { status: 400 });
        }

        try {
          return await handleImageRequest(context.env, key, request);
        } catch (error) {
          console.error(
            JSON.stringify({
              message: "r2 image fetch failed",
              key,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          return new Response("Internal server error", { status: 500 });
        }
      },
    },
  },
});
