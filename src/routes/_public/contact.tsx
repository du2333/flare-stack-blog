import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { siteDomainQuery } from "@/features/config/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/contact")({
  component: ContactPage,
  loader: async ({ context }) => {
    const domain = await context.queryClient.ensureQueryData(siteDomainQuery);
    return {
      canonicalHref: buildCanonicalUrl(domain, "/contact"),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: m.contact_title() },
      { name: "description", content: m.contact_description() },
    ],
    links: [canonicalLink(loaderData?.canonicalHref ?? "")],
  }),
});

function ContactPage() {
  return <theme.ContactPage />;
}
