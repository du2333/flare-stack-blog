import { createFileRoute, redirect } from "@tanstack/react-router";
import { ACCESS_PAGE_TO } from "@/features/config/components/admin/settings-pages";

export const Route = createFileRoute("/admin/access/")({
  beforeLoad: () => {
    throw redirect({ to: ACCESS_PAGE_TO["api-keys"], replace: true });
  },
});
