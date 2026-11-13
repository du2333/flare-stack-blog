import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { StatusPage } from "@/components/common/status-page";
import { buttonClass } from "@/components/ui/button";
import { unsubscribeQuery } from "@/features/email/queries";
import { CACHE_CONTROL } from "@/lib/constants";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/enum-values";
import { m } from "@/paraglide/messages";

const unsubscribeSearchSchema = z
  .object({
    userId: z.string(),
    type: z.enum(EMAIL_UNSUBSCRIBE_TYPES),
    token: z.string(),
  })
  .partial();

export const Route = createFileRoute("/_public/unsubscribe")({
  ssr: false,
  headers: () => CACHE_CONTROL.private,
  validateSearch: unsubscribeSearchSchema,
  component: UnsubscribePage,
  head: () => ({
    meta: [
      {
        title: m.unsubscribe_title(),
      },
    ],
  }),
});

function UnsubscribePage() {
  const { userId, type, token } = Route.useSearch();
  const hasValidParams = !!(userId && type && token);

  const { error, isLoading } = useQuery(
    unsubscribeQuery(
      {
        userId: userId!,
        type: type!,
        token: token!,
      },
      hasValidParams,
    ),
  );
  const hasFailed = !!error;

  if (!hasValidParams) {
    return (
      <StatusPage
        title={m.unsubscribe_invalid_title()}
        description={m.unsubscribe_invalid_desc()}
        action={<HomeLink />}
      />
    );
  }

  if (isLoading) {
    return <StatusPage title={m.unsubscribe_loading()} />;
  }

  if (hasFailed) {
    return (
      <StatusPage
        title={m.unsubscribe_failed_title()}
        description={m.unsubscribe_failed_desc()}
        action={<HomeLink />}
      />
    );
  }

  return (
    <StatusPage
      title={m.unsubscribe_success_title()}
      description={m.unsubscribe_success_desc()}
      action={<HomeLink />}
    />
  );
}

function HomeLink() {
  return (
    <Link to="/" className={buttonClass({ variant: "primary", size: "lg" })}>
      {m.unsubscribe_back_home()}
    </Link>
  );
}
