import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FriendLinksPage as FriendLinksView } from "@/features/friend-links/components/friend-links-page";
import { FriendLinksPageSkeleton } from "@/features/friend-links/components/friend-links-page-skeleton";
import { approvedFriendLinksQuery } from "@/features/friend-links/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/friend-links")({
  component: FriendLinksPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(approvedFriendLinksQuery());

    return {
      title: m.friend_links_title(),
      description: m.friend_links_desc(),
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
  pendingComponent: FriendLinksPageSkeleton,
});

function FriendLinksPage() {
  const { data: links } = useSuspenseQuery(approvedFriendLinksQuery());

  return <FriendLinksView links={links} />;
}
