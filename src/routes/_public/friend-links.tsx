import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import theme from "@theme";
import { approvedFriendLinksQuery } from "@/features/friend-links/queries";

export const Route = createFileRoute("/_public/friend-links")({
  component: FriendLinksPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(approvedFriendLinksQuery());

    return {
      title: "友情链接",
      description: "志同道合的站点，彼此链接，互相照亮。",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
      {
        name: "description",
        content: loaderData?.description,
      },
    ],
  }),
  pendingComponent: theme.FriendLinksPageSkeleton,
});

function FriendLinksPage() {
  const { data: links } = useSuspenseQuery(approvedFriendLinksQuery());

  return <theme.FriendLinksPage links={links} />;
}
