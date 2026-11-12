import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholderPage } from "@/components/admin/admin-placeholder-page";
import { m } from "@/paraglide/messages";

// A placeholder in the page frame; ticket #302 brings the taxonomy page.
export const Route = createFileRoute("/admin/taxonomy")({
  loader: () => ({ title: m.admin_taxonomy_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: TaxonomyPage,
});

function TaxonomyPage() {
  return (
    <AdminPlaceholderPage
      title={m.admin_taxonomy_title()}
      message={m.admin_taxonomy_placeholder()}
      action={{
        to: "/admin/posts",
        label: m.admin_taxonomy_placeholder_action(),
      }}
    />
  );
}
