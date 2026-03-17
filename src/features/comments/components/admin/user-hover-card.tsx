import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getUserStatsFn } from "@/features/comments/api/comments.admin.api";
import { COMMENTS_KEYS } from "@/features/comments/queries";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

// Query option for user stats
const userStatsQuery = (userId: string) =>
  queryOptions({
    queryKey: COMMENTS_KEYS.userStats(userId),
    queryFn: () => getUserStatsFn({ data: { userId } }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

interface UserHoverCardProps {
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  children: React.ReactNode;
}

export function UserHoverCard({ user, children }: UserHoverCardProps) {
  const { data: stats, isLoading } = useQuery({
    ...userStatsQuery(user.id),
    enabled: !!user.id,
  });

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-0 overflow-hidden border border-border shadow-2xl bg-background rounded-none animate-in fade-in zoom-in-95 duration-500"
        align="start"
      >
        <div className="p-8 space-y-8">
          {/* User Profile Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-4 max-w-45">
              <h4 className="text-xl font-serif font-medium leading-tight tracking-tight">
                {user.name}
              </h4>
              <p className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase bg-muted/30 px-2 py-1 inline-block">
                ID / {user.id.slice(0, 12)}...
              </p>
            </div>
            <div className="w-14 h-14 border border-border transition-all duration-700 bg-muted">
              {user.image ? (
                <img
                  src={user.image}
                  className="w-full h-full object-cover"
                  alt={user.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-xs">
                  {user.name.slice(0, 1)}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {m.comments_admin_user_joined_at()}
              </div>
              <p className="text-xs font-mono">
                {isLoading || !stats
                  ? m.comments_loading()
                  : formatDate(stats.registeredAt).split(" ")[0]}
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {m.comments_admin_user_activity()}
              </div>
              <p className="text-xs font-mono">
                {isLoading || !stats
                  ? "..."
                  : m.comments_count({ count: stats.totalComments })}
              </p>
            </div>

            <div className="col-span-2 space-y-1 pt-4 border-t border-border/50">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-600/80">
                {m.comments_admin_user_risk()}
              </div>
              <p className="text-xs font-mono text-orange-600">
                {isLoading || !stats
                  ? "..."
                  : stats.rejectedComments === 0
                    ? m.comments_admin_user_risk_clear()
                    : m.comments_admin_user_risk_flagged({
                        count: stats.rejectedComments,
                      })}
              </p>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
