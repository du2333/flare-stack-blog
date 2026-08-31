import { createFileRoute } from "@tanstack/react-router";
import { MutedUsersPage } from "@/features/muted-users/components/muted-users-page";
import { MutedUsersPageSkeleton } from "@/features/muted-users/components/muted-users-skeleton";
import { mutedUsersQuery } from "@/features/muted-users/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/muted-users/")({
  ssr: false,
  component: MutedUsersPage,
  pendingComponent: MutedUsersPageSkeleton,
  pendingMs: 0,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(mutedUsersQuery);
    return {
      title: m.muted_users_title(),
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});
