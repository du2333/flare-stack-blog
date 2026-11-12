import { Link, type LinkProps } from "@tanstack/react-router";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminPage } from "./admin-page";

/**
 * A page the navigation already reaches whose content a later task brings:
 * the frame, and one sentence on where to go meanwhile.
 */
export function AdminPlaceholderPage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action: { to: LinkProps["to"]; label: string };
}) {
  return (
    <AdminPage title={title} body="list">
      <EmptyState
        description={message}
        action={
          <Link to={action.to} className={buttonClass()}>
            {action.label}
          </Link>
        }
      />
    </AdminPage>
  );
}
