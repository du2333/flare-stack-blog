import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { MomentComposer } from "@/features/moments/components/admin";
import { MomentCard } from "@/features/moments/components/moment-card";
import { useIsAdmin } from "@/features/moments/hooks/use-is-admin";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { HomePagination } from "@/features/posts/components/home-pagination";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import { m } from "@/paraglide/messages";

interface MomentsPageProps {
  moments: Array<PublicMoment>;
  page: number;
  totalPages: number;
}

/**
 * The timeline, newest first. The Admin also gets the composer above it.
 */
export function MomentsPage({ moments, page, totalPages }: MomentsPageProps) {
  const isAdmin = useIsAdmin();
  // Cards stand apart; rows sit on the page with a rule between them, and
  // one under the composer. Where Posts are tiles the timeline is cards too:
  // it is one column in every form.
  const rows = useThemeRecipe().postCard === "row";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{m.moments_title()}</h1>
      {isAdmin ? (
        <div
          className={
            rows
              ? "pt-(--theme-row-pad-y) pb-[calc(var(--theme-row-pad-y)-1rem)]"
              : undefined
          }
        >
          <MomentComposer />
        </div>
      ) : null}
      {moments.length === 0 ? (
        <div className="fuwari-card-base fuwari-card-panel p-6">
          <EmptyState
            icon={MessageCircle}
            title={m.moments_empty_title()}
            description={m.moments_empty_description()}
          />
        </div>
      ) : (
        <div className={rows ? "flex flex-col" : "flex flex-col gap-4"}>
          {moments.map((moment, i) => (
            <div
              key={moment.id}
              className={
                rows
                  ? i > 0 || isAdmin
                    ? "fuwari-onload-animation py-(--theme-row-pad-y) fuwari-list-rule"
                    : "fuwari-onload-animation py-(--theme-row-pad-y)"
                  : "fuwari-onload-animation"
              }
              style={{
                animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
              }}
            >
              <MomentCard moment={moment} />
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 ? (
        <HomePagination to="/moments" page={page} totalPages={totalPages} />
      ) : null}
    </div>
  );
}
