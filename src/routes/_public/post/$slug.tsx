import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import theme from "@theme";
import { postBySlugQuery, relatedPostsQuery } from "@/features/posts/queries";

const searchSchema = z.object({
  highlightCommentId: z.coerce.number().optional(),
  rootId: z.number().optional(),
});

const { relatedPostsLimit } = theme.config.post;

export const Route = createFileRoute("/_public/post/$slug")({
  validateSearch: searchSchema,
  component: RouteComponent,
  loader: async ({ context, params }) => {
    // 1. Critical: Main post data - use serverFn (executes directly on server, no HTTP)
    const post = await context.queryClient.ensureQueryData(
      postBySlugQuery(params.slug),
    );

    // 2. Deferred: Related posts (prefetch only, don't await)
    void context.queryClient.prefetchQuery(
      relatedPostsQuery(params.slug, relatedPostsLimit),
    );

    if (!post) throw notFound();

    return post;
  },
  head: ({ loaderData: post }) => ({
    meta: [
      {
        title: post?.title,
      },
      {
        name: "description",
        content: post?.summary ?? "",
      },
      { property: "og:title", content: post?.title ?? "" },
      { property: "og:description", content: post?.summary ?? "" },
      { property: "og:type", content: "article" },
    ],
  }),
  pendingComponent: () => <theme.PostPageSkeleton />,
});

function RouteComponent() {
  const { data: post } = useSuspenseQuery(
    postBySlugQuery(Route.useParams().slug),
  );

  if (!post) throw notFound();

  return <theme.PostPage post={post} />;
}
