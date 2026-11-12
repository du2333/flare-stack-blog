import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import "@/components/ui/page-heading.css";
import "./dashboard.css";
import { DashboardComments } from "./dashboard-comments";
import { DashboardFriendLinks } from "./dashboard-friend-links";
import { DashboardHero } from "./dashboard-hero";
import { DashboardNotices } from "./dashboard-notices";
import { DashboardPopular } from "./dashboard-popular";
import { DashboardRecentPosts } from "./dashboard-recent-posts";
import { DashboardStats } from "./dashboard-stats";
import { DashboardWritingActivity } from "./dashboard-writing-activity";

export function DashboardPage() {
  const { data } = useSuspenseQuery({
    ...dashboardOverviewQuery,
    refetchOnMount: "always",
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.create(),
    onSuccess: (createdPost) => {
      void queryClient.invalidateQueries({
        queryKey: orpc.posts.admin.list.key(),
      });
      void queryClient.invalidateQueries({
        queryKey: orpc.dashboard.overview.key(),
      });
      void navigate({
        to: "/admin/posts/edit/$id",
        params: { id: String(createdPost.id) },
      });
    },
  });
  const createPost = createMutation.mutate;
  const isCreating = createMutation.isPending;
  const createLabel = isCreating
    ? m.admin_posts_creating()
    : m.admin_posts_create();

  return (
    <AdminPage
      className="dashboard-workspace"
      title={m.admin_overview_title()}
      primaryAction={{
        label: createLabel,
        icon: <Plus size={17} />,
        onClick: () => createPost(),
        loading: isCreating,
      }}
      body="list"
    >
      <DashboardHero
        popularity={data.popularity}
        unrepliedTotal={data.unrepliedComments.total}
        pendingFriendLinks={data.stats.pendingFriendLinks}
        latestDraft={data.latestDraft}
        onCreate={() => createPost()}
        isCreating={isCreating}
        createLabel={createLabel}
      />
      <DashboardNotices
        update={data.update}
        popularityAlert={data.popularityAlert}
        adminEmailNeedsSetup={data.adminEmailNeedsSetup}
        defaultSiteIdentity={data.defaultSiteIdentity}
      />
      <DashboardStats stats={data.stats} popularity={data.popularity} />
      <div className="dashboard-grid">
        <div className="dashboard-column dashboard-column-main">
          <DashboardPopular
            className="dashboard-slot-popular"
            popularity={data.popularity}
          />
          <DashboardWritingActivity
            className="dashboard-slot-activity"
            activity={data.writingActivity}
          />
          <DashboardRecentPosts
            className="dashboard-slot-recent"
            recentPosts={data.recentPosts}
            hasDraft={data.latestDraft !== null}
            onCreate={() => createPost()}
            isCreating={isCreating}
            createLabel={createLabel}
          />
        </div>
        <div className="dashboard-column dashboard-column-side">
          <DashboardComments
            className="dashboard-slot-comments"
            comments={data.unrepliedComments.items}
            total={data.unrepliedComments.total}
          />
          <DashboardFriendLinks
            className="dashboard-slot-links"
            pendingFriendLinks={data.pendingFriendLinks}
          />
        </div>
      </div>
    </AdminPage>
  );
}
