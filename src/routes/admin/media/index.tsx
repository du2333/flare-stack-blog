import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MediaLibrary } from "@/features/media/components/media-library";

const mediaSearchSchema = z.object({
  unused: z.boolean().optional().catch(false),
  search: z.string().optional().catch(""),
});

export const Route = createFileRoute("/admin/media/")({
  ssr: false,
  validateSearch: mediaSearchSchema,
  component: MediaLibrary,
  loader: () => ({
    title: "媒体库",
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});
