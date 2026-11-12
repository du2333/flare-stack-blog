import { createFileRoute, redirect } from "@tanstack/react-router";
import { MOVED_SETTINGS_PAGE_TO } from "@/features/config/components/admin/settings-pages";

/** Moved to 「接入」 (spec #298). */
export const Route = createFileRoute("/admin/settings/agent-skill")({
  beforeLoad: () => {
    throw redirect({
      to: MOVED_SETTINGS_PAGE_TO["agent-skill"],
      replace: true,
    });
  },
});
