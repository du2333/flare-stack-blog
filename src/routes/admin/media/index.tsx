import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MediaLibrary } from "@/features/media/components/media-library";
import { MediaLibraryPageSkeleton } from "@/features/media/components/media-library/media-library-skeleton";
import { m } from "@/paraglide/messages";

const mediaSearchSchema = z.object({
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  unused: z.boolean().optional().catch(false),
});

export const Route = createFileRoute("/admin/media/")({
  ssr: false,
  validateSearch: mediaSearchSchema,
  component: MediaLibrary,
  pendingComponent: MediaLibraryPageSkeleton,
  pendingMs: 0,
  loader: () => ({
    title: m.media_title(),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});
