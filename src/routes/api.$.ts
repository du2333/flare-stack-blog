import { createFileRoute } from "@tanstack/react-router";
import { createApiContext } from "@/lib/orpc/create-context";
import { openAPIHandler } from "@/lib/orpc/openapi-handler";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: async ({ request, context }) => {
        const { response } = await openAPIHandler.handle(request, {
          prefix: "/api",
          context: createApiContext(
            request.headers,
            context.env,
            context.executionCtx,
          ),
        });
        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});
