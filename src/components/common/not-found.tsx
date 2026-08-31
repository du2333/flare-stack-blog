import { Link } from "@tanstack/react-router";
import { StatusPage } from "@/components/common/status-page";
import { m } from "@/paraglide/messages";

export function NotFound() {
  return (
    <StatusPage
      code="404"
      title={m.not_found_title()}
      description={m.not_found_desc()}
      action={
        <Link
          to="/"
          className="fuwari-btn-primary h-10 rounded-xl px-6 text-sm font-medium"
        >
          {m.not_found_return()}
        </Link>
      }
    />
  );
}
