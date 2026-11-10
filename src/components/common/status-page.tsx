import type { ReactNode } from "react";
import "./status-page.css";

export function StatusPage({
  code,
  title,
  description,
  action,
}: {
  code?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="site-status-frame">
      <section
        className="site-status fuwari-card-base fuwari-card-standalone fuwari-content-enter"
        data-kind={code ? "error" : "neutral"}
      >
        {code ? <p className="site-status-code">{code}</p> : null}
        <h1>{title}</h1>
        {description ? (
          <p className="site-status-description">{description}</p>
        ) : null}
        {action ? <div className="site-status-actions">{action}</div> : null}
      </section>
    </div>
  );
}
