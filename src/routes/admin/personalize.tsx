import { createFileRoute } from "@tanstack/react-router";
import { SettingsSectionFrame } from "@/features/config/components/admin/settings-form-page";
import { PersonalizeStudio } from "@/features/config/components/admin/personalize/personalize-studio";
import { systemConfigQuery } from "@/features/config/queries";
import { PERSONALIZE_PAGE } from "@/features/config/utils/site-field-pages";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/personalize")({
  ssr: false,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(systemConfigQuery);
    return { title: m.personalize_title() };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
  component: PersonalizeRoute,
});

function PersonalizeRoute() {
  return (
    <SettingsSectionFrame title={m.personalize_title()} nav={PERSONALIZE_PAGE}>
      <PersonalizeStudio />
    </SettingsSectionFrame>
  );
}
