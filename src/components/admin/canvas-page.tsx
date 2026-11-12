import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { type AdminPageAction, useAdminPrimaryAction } from "./admin-chrome";
import "./canvas-page.css";

/** The style that places an element in the page's rise-in order. */
export function riseOrder(index: number) {
  return { "--i": index } as CSSProperties;
}

/**
 * A redesigned list page on the shell's canvas (spec #304): the title with
 * its count and the primary action, then a bar of tabs on the left and
 * tools on the right, then the body (a `ListCard`). Below 1024px the top
 * bar shows the title and the primary action instead of the head. The
 * pieces rise in one after another.
 */
export function CanvasPage({
  title,
  count,
  primaryAction,
  tabs,
  tools,
  children,
}: {
  title: ReactNode;
  count?: ReactNode;
  /**
   * Also the top bar's action on narrow screens. The icon is drawn at 16px
   * in the head and at 17px in the top bar, like the other pages' actions.
   */
  primaryAction?: Omit<AdminPageAction, "icon"> & { icon?: LucideIcon };
  tabs?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const Icon = primaryAction?.icon;
  useAdminPrimaryAction(
    primaryAction && {
      ...primaryAction,
      icon: Icon ? <Icon size={17} /> : undefined,
    },
  );
  return (
    <div className="admin-canvas-page">
      <header className="admin-canvas-head admin-rise" style={riseOrder(0)}>
        <h1 className="admin-canvas-title">
          {title}
          {count === undefined ? null : <small>{count}</small>}
        </h1>
        {primaryAction ? (
          <Button
            ref={primaryAction.ref}
            variant="ink"
            className="admin-canvas-primary"
            icon={Icon ? <Icon size={16} /> : undefined}
            disabled={primaryAction.disabled || primaryAction.loading}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
        ) : null}
      </header>
      {tabs || tools ? (
        <div className="admin-canvas-bar admin-rise" style={riseOrder(1)}>
          {tabs}
          {tools ? <div className="admin-canvas-tools">{tools}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
