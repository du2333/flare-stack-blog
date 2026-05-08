import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { siteDomainQuery } from "@/features/config/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/terms")({
  component: TermsPage,
  loader: async ({ context }) => {
    const domain = await context.queryClient.ensureQueryData(siteDomainQuery);
    return {
      canonicalHref: buildCanonicalUrl(domain, "/terms"),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: m.terms_title() },
      { name: "description", content: m.terms_description() },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "")],
  }),
});

function TermsPage() {
  return <theme.TermsPage />;
}
