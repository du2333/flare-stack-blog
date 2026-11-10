import type { ReactNode } from "react";

/** One Maintenance action: what it does and its result, with its button. */
export function MaintenanceItem({
  title,
  lines,
  action,
  children,
}: {
  title: string;
  /** What the action does, one line per entry. */
  lines: ReadonlyArray<ReactNode>;
  action: ReactNode;
  /** The result of the last run. */
  children?: ReactNode;
}) {
  return (
    <div className="settings-maintenance-item">
      <div className="min-w-0">
        <p className="settings-maintenance-title">{title}</p>
        {lines.map((line, index) => (
          <p key={index} className="settings-maintenance-desc">
            {line}
          </p>
        ))}
        {children}
      </div>
      {action}
    </div>
  );
}
