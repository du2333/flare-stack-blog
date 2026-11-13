import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ from: "/", to: "/admin/settings/site" });
  },
});
