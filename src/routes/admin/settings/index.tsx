import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { SettingsDirectory } from "@/features/config/components/admin/settings-directory";
import { LEGACY_SETTINGS_TAB_TO } from "@/features/config/components/admin/settings-pages";
import { SettingsShell } from "@/features/config/components/admin/settings-shell";
import { systemConfigQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  tab: z
    .enum(["site", "email", "webhook", "api-keys", "maintenance"])
    .optional(),
});

export const Route = createFileRoute("/admin/settings/")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (!search.tab) return;
    throw redirect({
      from: "/",
      to: LEGACY_SETTINGS_TAB_TO[search.tab],
    });
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(systemConfigQuery);
    return { title: m.settings_header_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: SettingsIndexPage,
});

function SettingsIndexPage() {
  return (
    <SettingsShell title={m.settings_header_title()}>
      <SettingsDirectory />
    </SettingsShell>
  );
}
