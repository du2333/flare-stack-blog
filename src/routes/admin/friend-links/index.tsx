import { createFileRoute } from "@tanstack/react-router";
import { adminFriendLinksSearchSchema } from "@/features/friend-links/admin-friend-links-search";
import { FriendLinkManager } from "@/features/friend-links/components/admin/friend-link-manager";
import { FriendLinkManagerPageSkeleton } from "@/features/friend-links/components/admin/friend-link-manager/friend-link-manager-skeleton";
import { allFriendLinksQuery } from "@/features/friend-links/queries";
import type { FriendLinkStatus } from "@/lib/db/schema";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/friend-links/")({
  ssr: false,
  validateSearch: adminFriendLinksSearchSchema,
  pendingComponent: FriendLinkManagerPageSkeleton,
  pendingMs: 0,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      allFriendLinksQuery({
        status: "pending",
        limit: ADMIN_ITEMS_PER_PAGE,
        offset: 0,
      }),
    );
    return {
      title: m.friend_links_admin_title(),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
  component: FriendLinksAdminPage,
});

function FriendLinksAdminPage() {
  const { status, page, search } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <FriendLinkManager
      search={search}
      onSearchChange={(search) =>
        navigate({ search: { status, page: 1, search }, replace: true })
      }
      status={status}
      page={page}
      onStatusChange={(next: FriendLinkStatus) =>
        navigate({
          search: { status: next, page: 1, search: "" },
        })
      }
      onPageChange={(next) =>
        navigate({
          search: (prev) => ({ ...prev, page: next }),
        })
      }
    />
  );
}
