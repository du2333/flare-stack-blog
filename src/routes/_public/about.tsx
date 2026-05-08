import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { siteDomainQuery } from "@/features/config/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/about")({
  component: AboutPage,
  loader: async ({ context }) => {
    const domain = await context.queryClient.ensureQueryData(siteDomainQuery);
    return {
      canonicalHref: buildCanonicalUrl(domain, "/about"),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: m.about_title() },
      { name: "description", content: m.about_description() },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "")],
  }),
});

function AboutPage() {
  return <theme.AboutPage />;
}
