import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { siteDomainQuery } from "@/features/config/queries";
import { MomentsPage } from "@/features/moments/components/moments-page";
import { MomentsPageSkeleton } from "@/features/moments/components/moments-page-skeleton";
import { momentsPageQuery } from "@/features/moments/queries";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/moments/")({
  validateSearch: z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(1_000_000)
      .optional()
      .catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps }) => {
    const [moments, domain] = await Promise.all([
      context.queryClient.ensureQueryData(momentsPageQuery(deps.page)),
      context.queryClient.ensureQueryData(siteDomainQuery),
    ]);

    // A page past the last answers the last page; its address is that page's.
    if (moments.page !== deps.page) {
      throw redirect({
        to: "/moments",
        search: { page: moments.page === 1 ? undefined : moments.page },
        replace: true,
      });
    }
    return {
      canonicalHref: buildCanonicalUrl(domain, "/moments", {
        page: moments.page === 1 ? undefined : String(moments.page),
      }),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: m.moments_title() },
      { name: "description", content: m.moments_description() },
    ],
    links: [
      canonicalLink(loaderData?.canonicalHref ?? "/moments"),
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Moments RSS Feed",
        href: "/moments/rss.xml",
      },
      {
        rel: "alternate",
        type: "application/atom+xml",
        title: "Moments Atom Feed",
        href: "/moments/atom.xml",
      },
      {
        rel: "alternate",
        type: "application/feed+json",
        title: "Moments JSON Feed",
        href: "/moments/feed.json",
      },
    ],
  }),
  pendingComponent: MomentsPageSkeleton,
  component: MomentsRoute,
});

function MomentsRoute() {
  const { page = 1 } = Route.useSearch();
  const { data } = useSuspenseQuery(momentsPageQuery(page));
  return (
    <MomentsPage
      moments={data.items}
      page={data.page}
      totalPages={data.totalPages}
    />
  );
}
