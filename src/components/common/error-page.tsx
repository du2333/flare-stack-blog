import { useRouter } from "@tanstack/react-router";
import { StatusPage } from "@/components/common/status-page";
import { m } from "@/paraglide/messages";

export function ErrorPage({ error: _error }: { error?: Error }) {
  const router = useRouter();

  return (
    <StatusPage
      code="500"
      title={m.error_title()}
      description={m.error_desc()}
      action={
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="fuwari-btn-primary h-10 rounded-xl px-6 text-sm font-medium"
        >
          {m.error_retry()}
        </button>
      }
    />
  );
}
