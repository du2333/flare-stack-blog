import { createFileRoute } from "@tanstack/react-router";
import { TaxonomyPage } from "@/features/taxonomy/components/taxonomy-page";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/taxonomy")({
  ssr: false,
  loader: () => ({ title: m.admin_taxonomy_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: TaxonomyPage,
});
