import { createFileRoute } from "@tanstack/react-router";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { TagManager } from "@/features/tags/components/tag-manager";
import { TaxonomySkeleton } from "@/components/admin/taxonomy-skeleton";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/tags/")({
  ssr: "data-only",
  component: TagManagerRoute,
  pendingComponent: TaxonomySkeleton,
  pendingMs: 0,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(tagsWithCountAdminQueryOptions()),
      context.queryClient.ensureQueryData(categoriesAdminQueryOptions()),
    ]);
    return {
      title: m.taxonomy_manager_title(),
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
  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <h1 className="hidden lg:block text-2xl font-medium fuwari-text-90">
        {m.taxonomy_manager_title()}
      </h1>
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <CategoryManager />
        <div className="lg:border-l lg:border-(--fuwari-input-border) lg:pl-8">
          <TagManager />
        </div>
      </div>
    </div>
  );
}
