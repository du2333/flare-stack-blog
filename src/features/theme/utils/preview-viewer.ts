import type { QueryClient } from "@tanstack/react-query";
import { sessionQuery } from "@/features/auth/queries";

/**
 * Whether the viewer may see a Theme preview. On the server it reads the
 * request's session directly rather than through the query client, so the
 * session is not written into the page's dehydrated queries; the request
 * reached the renderer only past the cache (`workersCacheRoute`). A failed
 * lookup counts as no.
 */
export async function previewViewerIsAdmin(
  queryClient: QueryClient,
): Promise<boolean> {
  try {
    if (import.meta.env.SSR) {
      const { getRequestSession } =
        await import("@/lib/auth/get-request-session");
      return (await getRequestSession())?.user.role === "admin";
    }
    const session = await queryClient.ensureQueryData(sessionQuery);
    return session?.user.role === "admin";
  } catch {
    return false;
  }
}
