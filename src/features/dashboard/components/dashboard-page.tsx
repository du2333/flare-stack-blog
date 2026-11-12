import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { PenLine, Plus } from "lucide-react";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import "@/components/ui/page-heading.css";
import "./dashboard.css";
import { DashboardComments } from "./dashboard-comments";
import { DashboardPopular } from "./dashboard-popular";
import { DashboardRecentPosts } from "./dashboard-recent-posts";
import { DashboardStats } from "./dashboard-stats";
import { DashboardTiles } from "./dashboard-tiles";
import { DashboardWritingActivity } from "./dashboard-writing-activity";
import { formatToday } from "./format";
import { greeting } from "./greeting";

/**
 * 「一览」: the greeting and the date on top, with the next thing to write as
 * the page's action; then what waits on the Admin, the site's state, the
 * latest Comments to answer and the Posts last edited.
 */
export function DashboardPage() {
  const { data } = useSuspenseQuery({
    ...dashboardOverviewQuery,
    refetchOnMount: "always",
  });
  const { session } = useRouteContext({ from: "/admin" });
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
  const isCreating = createMutation.isPending;
  const createLabel = isCreating
    ? m.admin_posts_creating()
    : m.admin_posts_create();
  const createPost = () => createMutation.mutate();
  const draft = data.latestDraft;
  const now = new Date();

  return (
    <AdminPage
      className="dashboard-workspace"
      title={greeting(session.user.name, now.getHours())}
      description={formatToday(now)}
      primaryAction={
        draft
          ? {
              label: m.dashboard_continue_writing(),
              icon: <PenLine size={17} />,
              onClick: () =>
                void navigate({
                  to: "/admin/posts/edit/$id",
                  params: { id: String(draft.id) },
                }),
            }
          : {
              label: createLabel,
              icon: <Plus size={17} />,
              onClick: createPost,
              loading: isCreating,
            }
      }
      actions={
        draft ? (
          <Button
            variant="regular"
            icon={<Plus size={17} />}
            loading={isCreating}
            onClick={createPost}
          >
            {createLabel}
          </Button>
        ) : undefined
      }
      body="list"
    >
      <DashboardTiles data={data} />
      <div className="glance-grid">
        <div className="glance-col glance-col-main">
          <DashboardStats
            className="glance-slot-status"
            stats={data.stats}
            popularity={data.popularity}
          />
          <DashboardPopular
            className="glance-slot-popular"
            popularity={data.popularity}
            alert={data.popularityAlert}
          />
          <DashboardWritingActivity
            className="glance-slot-activity"
            activity={data.writingActivity}
          />
        </div>
        <div className="glance-col glance-col-side">
          <DashboardComments
            className="glance-slot-comments"
            comments={data.unrepliedComments.items}
            total={data.unrepliedComments.total}
          />
          <DashboardRecentPosts
            className="glance-slot-recent"
            recentPosts={data.recentPosts}
          />
        </div>
      </div>
    </AdminPage>
  );
}
