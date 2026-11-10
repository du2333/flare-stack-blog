import type { ReactNode } from "react";

/**
 * What a settings section is for, and its actions. The tab already names the
 * section, so this takes the top of the content where a heading would sit.
 */
export function SettingsLead({
  description,
  actions,
}: {
  description: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="settings-lead">
      <p>{description}</p>
      {actions ? <div className="settings-lead-actions">{actions}</div> : null}
    </div>
  );
}
