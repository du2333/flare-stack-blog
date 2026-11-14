import { X } from "lucide-react";
import { type ReactNode, useId } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";

/**
 * The sheet the two notices of 「概览」 open for their details: a title with
 * an optional badge, a scrolling body, and a footer with the notice's
 * controls and the one live region of its failures. From the right on wider
 * screens; on a phone it rises from the lower edge, the primitive's own
 * phone form, which leaves the page's top in view.
 */
export function NoticeSheet({
  open,
  onClose,
  title,
  badge,
  failure,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  badge?: ReactNode;
  /** The failure the sheet's controls caused; the region stays mounted. */
  failure: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  // Below Tailwind's md (768px), where the Admin's own phone rules stop.
  const phone = useMediaQuery("(max-width: 767px)");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      side={phone ? "bottom" : "right"}
      size="lg"
      aria-labelledby={titleId}
      className="overview-sheet"
    >
      <header className="overview-sheet-head">
        <div className="overview-sheet-title">
          <h2 id={titleId}>{title}</h2>
          {badge}
        </div>
        <IconButton
          size="sm"
          variant="quiet"
          label={m.common_close()}
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </IconButton>
      </header>
      <div className="overview-sheet-body">{children}</div>
      <footer className="overview-sheet-foot">
        <p role="alert" className="overview-sheet-failure">
          {failure}
        </p>
        <div className="overview-sheet-actions">{actions}</div>
      </footer>
    </Sheet>
  );
}
