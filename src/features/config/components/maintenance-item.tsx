import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * One Maintenance action as a tile: its icon, what it does, the result of
 * the last run, and its button at the foot. `danger` marks what cannot be
 * undone, with `flag` saying so.
 */
export function MaintenanceItem({
  icon: Icon,
  title,
  lines,
  action,
  danger = false,
  flag,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** What the action does, one line per entry. */
  lines: ReadonlyArray<ReactNode>;
  action: ReactNode;
  danger?: boolean;
  /** A word beside the title, such as 「危险操作」. */
  flag?: string;
  /** The result of the last run. */
  children?: ReactNode;
}) {
  return (
    <div
      className="settings-maintenance-item"
      data-danger={danger ? "" : undefined}
    >
      <span className="settings-maintenance-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="settings-maintenance-copy">
        <p className="settings-maintenance-title">
          {title}
          {flag ? (
            <Badge size="sm" tone={danger ? "danger" : "neutral"}>
              {flag}
            </Badge>
          ) : null}
        </p>
        {lines.map((line, index) => (
          <p key={index} className="settings-maintenance-desc">
            {line}
          </p>
        ))}
        {children}
      </div>
      <div className="settings-maintenance-action">{action}</div>
    </div>
  );
}
