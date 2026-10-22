import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import theme from "@theme";
import { requireFeature } from "@/features/config/features";
import { siteConfigQuery } from "@/features/config/queries";
import { momentsQuery } from "@/features/moments/queries";
import type { ThemeComponents } from "@/features/theme/contract/components";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/moments")({
  beforeLoad: async ({ context }) => {
    const siteConfig = await context.queryClient.ensureQueryData(
      siteConfigQuery,
    );
    requireFeature(siteConfig, "moments");
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(momentsQuery());

    return {
      title: m.moments_title(),
      description: m.moments_desc(),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title },
      { name: "description", content: loaderData?.description },
    ],
  }),
  component: MomentsRoute,
});

function MomentsRoute() {
  const { data } = useSuspenseQuery(momentsQuery());
  const Page = (theme as Partial<ThemeComponents>).MomentsPage;

  if (!Page) {
    throw notFound();
  }

  return <Page moments={data.items} />;
}
