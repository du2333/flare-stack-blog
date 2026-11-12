import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholderPage } from "@/components/admin/admin-placeholder-page";
import { m } from "@/paraglide/messages";

// A placeholder in the page frame; ticket #301 brings the comments page.
export const Route = createFileRoute("/admin/comments")({
  loader: () => ({ title: m.admin_comments_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: CommentsPage,
});

function CommentsPage() {
  return (
    <AdminPlaceholderPage
      title={m.admin_comments_title()}
      message={m.admin_comments_placeholder()}
      action={{ to: "/admin", label: m.admin_comments_placeholder_action() }}
    />
  );
}
