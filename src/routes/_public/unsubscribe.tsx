import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { unsubscribeByTokenFn } from "@/features/email/api/email.api";
import { EMAIL_KEYS } from "@/features/email/queries";
import { EMAIL_UNSUBSCRIBE_TYPES } from "@/lib/db/schema";
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

  const { data, error, isLoading } = useQuery({
    queryKey: EMAIL_KEYS.unsubscribe({
      userId: userId!,
      type: type!,
      token: token!,
    }),
    queryFn: () =>
      unsubscribeByTokenFn({
        data: { userId: userId!, type: type!, token: token! },
      }),
    retry: false,
    enabled: hasValidParams,
  });
  const hasBusinessError = !!data?.error;
  const hasFailed = !!error || hasBusinessError;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {!hasValidParams ? (
          <div className="space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif">
                {m.unsubscribe_invalid_title()}
              </h1>
              <p className="text-muted-foreground">
                {m.unsubscribe_invalid_desc()}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-none">
              <a href="/">{m.unsubscribe_back_home()}</a>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-serif">{m.unsubscribe_loading()}</h1>
          </div>
        ) : hasFailed ? (
          <div className="space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif text-red-500">
                {m.unsubscribe_failed_title()}
              </h1>
              <p className="text-muted-foreground">
                {m.unsubscribe_failed_desc()}
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-none">
              <a href="/">{m.unsubscribe_back_home()}</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h1 className="text-2xl font-serif">
                {m.unsubscribe_success_title()}
              </h1>
              <p className="text-muted-foreground">
                {m.unsubscribe_success_desc()}
              </p>
            </div>
            <Button asChild className="rounded-none px-8">
              <a href="/">{m.unsubscribe_back_home()}</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
