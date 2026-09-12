import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { LEGACY_SETTINGS_TAB_TO } from "@/features/config/components/admin/settings-pages";

export const Route = createFileRoute("/admin/settings/")({
  ssr: false,
  validateSearch: z.object({
    tab: z
      .enum(["site", "email", "webhook", "api-keys", "maintenance"])
      .optional(),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      from: "/",
      to: search.tab
        ? LEGACY_SETTINGS_TAB_TO[search.tab]
        : "/admin/settings/site",
    });
  },
});
