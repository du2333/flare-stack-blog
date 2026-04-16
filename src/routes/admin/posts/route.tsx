import { createFileRoute, Outlet } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/posts")({
  component: RouteComponent,
  loader: () => ({
    title: m.admin_posts_title(),
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function RouteComponent() {
  return <Outlet />;
}
