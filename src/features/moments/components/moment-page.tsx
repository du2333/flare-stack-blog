import { PublicPageHeading } from "@/components/ui/page-heading";
import { MomentCard } from "@/features/moments/components/moment-card";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { m } from "@/paraglide/messages";

/** One Moment on a page of its own, with the way back to the timeline. */
export function MomentPage({ moment }: { moment: PublicMoment }) {
  return (
    <div
      className="fuwari-onload-animation flex flex-col gap-4"
      style={{ animationDelay: "var(--fuwari-content-delay)" }}
    >
      <PublicPageHeading
        title={m.moments_title()}
        back={{ to: "/moments", label: m.moments_all() }}
      />
      <MomentCard moment={moment} />
    </div>
  );
}
