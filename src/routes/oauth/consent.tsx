import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Check,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { sessionQuery } from "@/features/auth/queries";
import { getOAuthClientMetadataFn } from "@/features/oauth-provider/api/oauth-provider.public.api";
import { OAUTH_MANAGED_SCOPES } from "@/features/oauth-provider/oauth-provider.config";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const consentSearchSchema = z.object({
  client_id: z.string().optional(),
  redirect_uri: z.string().optional(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (search) => consentSearchSchema.parse(search),
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirectTo: location.href,
        },
      });
    }

    if (session.user.role !== "admin") {
      throw redirect({ to: "/" });
    }

    return { session };
  },
  head: () => ({
    meta: [
      {
        title: m.oauth_consent_title(),
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const [isPending, setIsPending] = useState(false);
  const [completedRedirectUrl, setCompletedRedirectUrl] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const clientId = search.client_id ?? "";

  const { data: clientMetadata } = useQuery({
    queryKey: ["oauth-client-metadata", clientId],
    queryFn: () => getOAuthClientMetadataFn({ data: { clientId } }),
    enabled: !!clientId,
  });

  const requestedScopes = useMemo(
    () =>
      (search.scope ?? "")
        .split(" ")
        .map((scope) => scope.trim())
        .filter(Boolean),
    [search.scope],
  );

  const requestedManagedScopes = useMemo(
    () =>
      requestedScopes.filter((scope) =>
        OAUTH_MANAGED_SCOPES.includes(
          scope as (typeof OAUTH_MANAGED_SCOPES)[number],
        ),
      ),
    [requestedScopes],
  );

  const requiredSystemScopes = useMemo(
    () =>
      requestedScopes.filter(
        (scope) => !requestedManagedScopes.includes(scope),
      ),
    [requestedScopes, requestedManagedScopes],
  );

  const [selectedManagedScopes, setSelectedManagedScopes] = useState(
    () => requestedManagedScopes,
  );

  async function submitConsent(accept: boolean) {
    setIsPending(true);
    setCompletedRedirectUrl(null);
    setError(null);

    try {
      const oauthQuery = window.location.search.slice(1);

      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          accept,
          scope: accept
            ? [...requiredSystemScopes, ...selectedManagedScopes].join(" ")
            : undefined,
          oauth_query: oauthQuery,
        }),
      });

      if (!response.ok) {
        const message = await response
          .text()
          .catch(() => m.oauth_consent_error_failed());
        throw new Error(message || m.oauth_consent_error_failed());
      }

      const result = (await response.json()) as {
        redirect_uri?: string;
        redirectURI?: string;
        url?: string;
      };
      const redirectUrl =
        result.redirect_uri ?? result.redirectURI ?? result.url;

      if (!redirectUrl) {
        throw new Error(m.oauth_consent_error_missing_redirect());
      }

      window.location.assign(redirectUrl);
      window.setTimeout(() => {
        setIsPending(false);
        setCompletedRedirectUrl(redirectUrl);
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : m.oauth_consent_error_failed(),
      );
      setIsPending(false);
    }
  }

  const clientName =
    clientMetadata?.clientName ||
    search.client_id ||
    m.oauth_consent_unknown_client();
  const clientIcon = clientMetadata?.clientIcon;
  const isCompleted = completedRedirectUrl !== null;

  return (
    <div className="min-h-screen bg-background/50 flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <Card className="border-border/30 shadow-2xl shadow-foreground/5 bg-card/80 backdrop-blur-sm overflow-hidden rounded-2xl">
          <CardHeader className="space-y-8 pb-10 border-b border-border/10 bg-muted/5 p-10">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-3xl bg-foreground/3 border border-foreground/10 flex items-center justify-center overflow-hidden shadow-inner">
                {clientIcon ? (
                  <img
                    src={clientIcon}
                    alt={clientName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShieldCheck className="h-12 w-12 text-foreground/40" />
                )}
              </div>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-[11px] uppercase font-mono tracking-[0.4em] text-muted-foreground/60">
                {m.oauth_consent_eyebrow()}
              </p>
              <CardTitle className="text-3xl sm:text-4xl font-serif tracking-tight">
                {m.oauth_consent_title()}
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground/80 mt-2">
                {m.oauth_consent_client({ client: clientName })}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-10 p-10">
            {isCompleted && (
              <div className="space-y-5 rounded-2xl border border-foreground/15 bg-foreground/3 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15 bg-background">
                  <Check className="h-5 w-5 text-foreground/80" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-medium">
                    {m.oauth_consent_success_title()}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {m.oauth_consent_success_desc()}
                  </p>
                </div>
              </div>
            )}

            {/* System Scopes (Required) */}
            {!isCompleted && requiredSystemScopes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground/60" />
                  <h4 className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground/60">
                    {m.oauth_consent_required_scopes_label()}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {requiredSystemScopes.map((scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      className="px-3 py-1 rounded-none font-mono text-[10px] bg-muted/40 border-border/20 lowercase tracking-wide"
                    >
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Managed Scopes (Selectable) */}
            {!isCompleted && requestedManagedScopes.length > 0 ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground/60" />
                  <h4 className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground/60">
                    {m.oauth_consent_choose_business_scopes()}
                  </h4>
                </div>
                <div className="grid gap-3">
                  {requestedManagedScopes.map((scope) => {
                    const isSelected = selectedManagedScopes.includes(scope);
                    return (
                      <label
                        key={scope}
                        className={cn(
                          "group flex items-center justify-between gap-4 border p-5 transition-all cursor-pointer rounded-xl",
                          isSelected
                            ? "bg-foreground/3 border-foreground/30 shadow-sm"
                            : "bg-transparent border-border/20 hover:border-border/40",
                        )}
                      >
                        <div className="space-y-1">
                          <span className="font-mono text-xs uppercase tracking-widest text-foreground/90 group-hover:text-foreground transition-colors">
                            {scope}
                          </span>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedManagedScopes((current) =>
                              checked
                                ? [...new Set([...current, scope])]
                                : current.filter((item) => item !== scope),
                            );
                          }}
                          className="h-6 w-6 rounded-md border-foreground/20 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground transition-all"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              !isCompleted &&
              requestedScopes.length === 0 && (
                <div className="py-12 text-center border border-dashed border-border/20 bg-muted/5 rounded-2xl">
                  <p className="text-sm text-muted-foreground/60 italic font-mono">
                    {m.oauth_consent_no_scopes()}
                  </p>
                </div>
              )
            )}

            {error && (
              <div className="p-5 bg-destructive/5 border border-destructive/20 text-destructive text-sm font-mono animate-in fade-in slide-in-from-top-3 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 font-bold">ERROR //</span>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-10 pt-0 flex flex-col sm:flex-row gap-4">
            {isCompleted && completedRedirectUrl ? (
              <Button
                type="button"
                className="flex-1 h-14 rounded-xl font-mono text-xs uppercase tracking-[0.25em] group shadow-lg shadow-foreground/5"
                onClick={() => window.location.assign(completedRedirectUrl)}
              >
                {m.oauth_consent_open_client()}
                <ExternalLink className="ml-2.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="flex-1 h-14 rounded-xl font-mono text-xs uppercase tracking-[0.25em] group shadow-lg shadow-foreground/5"
                  disabled={isPending}
                  onClick={() => submitConsent(true)}
                >
                  {isPending ? (
                    m.common_processing()
                  ) : (
                    <>
                      {m.oauth_consent_allow()}
                      <Check className="ml-2.5 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-14 rounded-xl font-mono text-xs uppercase tracking-[0.25em] group"
                  disabled={isPending}
                  onClick={() => submitConsent(false)}
                  variant="outline"
                >
                  {m.oauth_consent_deny()}
                  <X className="ml-2.5 h-4 w-4 group-hover:scale-110 transition-transform" />
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        <p className="mt-10 text-center text-[11px] text-muted-foreground/30 font-mono uppercase tracking-[0.4em] mix-blend-multiply dark:mix-blend-screen px-4">
          {m.oauth_consent_secured_by()}
        </p>
      </div>
    </div>
  );
}
