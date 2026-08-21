import { createFileRoute } from "@tanstack/react-router";
import { handleAuthRequest } from "@/lib/http/handle-auth-request";

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      ANY: async ({ request, context }) =>
        handleAuthRequest(request, context.env),
    },
  },
});
