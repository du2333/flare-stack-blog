import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/posts/edit/$id")({
  component: () => (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <Outlet />
    </div>
  ),
});
