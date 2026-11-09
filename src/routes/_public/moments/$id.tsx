import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/common/not-found";
import { siteDomainQuery } from "@/features/config/queries";
import { MomentPage } from "@/features/moments/components/moment-page";
import { MomentPageSkeleton } from "@/features/moments/components/moments-page-skeleton";
import { momentQuery } from "@/features/moments/queries";
import {
  momentDescription,
  momentTitle,
} from "@/features/moments/utils/moment-share";
import { isCanonicalId } from "@/lib/orpc/path-ids";
import { buildCanonicalUrl, canonicalLink } from "@/lib/seo";
import { m } from "@/paraglide/messages";
import { z } from "zod";

/** The id an address names, or null for one that names none (`/moments/07`, `/moments/x`). */
function momentIdOf(param: string) {
  return isCanonicalId(param) ? Number(param) : null;
}

const searchSchema = z.object({
  comment: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_public/moments/$id")({
  validateSearch: searchSchema,
  component: RouteComponent,
  notFoundComponent: NotFound,
  loader: async ({ context, params }) => {
    const id = momentIdOf(params.id);
    if (id === null) throw notFound();

    const [moment, domain] = await Promise.all([
      context.queryClient.ensureQueryData(momentQuery(id)),
      context.queryClient.ensureQueryData(siteDomainQuery),
    ]);
    if (!moment) throw notFound();

    return {
      moment,
      canonicalHref: buildCanonicalUrl(domain, `/moments/${id}`),
    };
  },
  head: ({ loaderData }) => {
    const moment = loaderData?.moment;
    const canonicalHref = loaderData?.canonicalHref ?? "";
    if (!moment) return {};

    const title = momentTitle(
      moment,
      moment.video ? m.moments_video_only() : m.moments_image_only(),
    );
    const description = momentDescription(moment);
    const [firstImage] = moment.images;
    const imageUrl =
      firstImage && canonicalHref
        ? new URL(firstImage.url, canonicalHref).toString()
        : undefined;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonicalHref },
        ...(imageUrl
          ? [
              { property: "og:image", content: imageUrl },
              { name: "twitter:card", content: "summary_large_image" },
              { name: "twitter:image", content: imageUrl },
            ]
          : []),
      ],
      links: [
        canonicalLink(canonicalHref),
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
    };
  },
  pendingComponent: MomentPageSkeleton,
  pendingMs: 0,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const momentId = momentIdOf(id);
  if (momentId === null) throw notFound();

  const { data: moment } = useSuspenseQuery(momentQuery(momentId));
  if (!moment) throw notFound();

  return <MomentPage moment={moment} />;
}
