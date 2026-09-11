import { useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TaxonomyWorkspace } from "@/components/admin/taxonomy-workspace";
import {
  taxonomySearchSchema,
  type TaxonomyState,
} from "@/components/admin/taxonomy-state";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { TaxonomySkeleton } from "@/components/admin/taxonomy-skeleton";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/tags/")({
  ssr: "data-only",
  component: TagManagerRoute,
  validateSearch: taxonomySearchSchema,
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
  const state = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/tags/" });
  const change = useCallback(
    (patch: Partial<TaxonomyState>, replace = false) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        replace,
      });
    },
    [navigate],
  );
  return <TaxonomyWorkspace state={state} onChange={change} />;
}
