import { createFileRoute, redirect } from "@tanstack/react-router";
import { MOVED_SETTINGS_PAGE_TO } from "@/features/config/components/admin/settings-pages";

/** Moved under 「互动」 (spec #298). */
export const Route = createFileRoute("/admin/settings/muted-users")({
  beforeLoad: () => {
    throw redirect({
      to: MOVED_SETTINGS_PAGE_TO["muted-users"],
      replace: true,
    });
  },
});
