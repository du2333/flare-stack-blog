import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { siteDomainQuery } from "@/features/config/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/privacy")({
  component: PrivacyPage,
  loader: async ({ context }) => {
    const domain = await context.queryClient.ensureQueryData(siteDomainQuery);
    return {
      canonicalHref: buildCanonicalUrl(domain, "/privacy"),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: m.privacy_title() },
      { name: "description", content: m.privacy_description() },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "")],
  }),
});

function PrivacyPage() {
  return <theme.PrivacyPage />;
}
