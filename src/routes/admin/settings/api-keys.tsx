import { createFileRoute, redirect } from "@tanstack/react-router";
import { MOVED_SETTINGS_PAGE_TO } from "@/features/config/components/admin/settings-pages";

/** Moved to 「接入」 (spec #298). */
export const Route = createFileRoute("/admin/settings/api-keys")({
  beforeLoad: () => {
    throw redirect({ to: MOVED_SETTINGS_PAGE_TO["api-keys"], replace: true });
  },
});
