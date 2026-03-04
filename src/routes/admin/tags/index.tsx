import { createFileRoute } from "@tanstack/react-router";
import { TagManager } from "@/features/tags/components/tag-manager";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";

export const Route = createFileRoute("/admin/tags/")({
  ssr: "data-only",
  component: TagManagerRoute,
  loader: async ({ context }) => {
    // Prefetch tags with count for a smooth load
    await context.queryClient.prefetchQuery(tagsWithCountAdminQueryOptions());
    return {
      title: "标签管理",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function TagManagerRoute() {
  return <TagManager />;
}
