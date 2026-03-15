import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const consentSearchSchema = z.object({
  client_id: z.string().optional(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: (search) => consentSearchSchema.parse(search),
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestedScopes = (search.scope ?? "")
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);

  async function submitConsent(accept: boolean) {
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ accept }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "Consent failed");
        throw new Error(message || "Consent failed");
      }

      const result = (await response.json()) as { redirectURI?: string };
      if (!result.redirectURI) {
        throw new Error("Missing redirect URI");
      }

      window.location.assign(result.redirectURI);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Consent failed");
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          OAuth Consent
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Authorize client access
        </h1>
        <p className="text-sm text-muted-foreground">
          Client: {search.client_id ?? "unknown"}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          This client is requesting access to the following scopes:
        </p>
        <div className="flex flex-wrap gap-2">
          {requestedScopes.length > 0 ? (
            requestedScopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full border px-3 py-1 text-sm"
              >
                {scope}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              No scopes requested
            </span>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button disabled={isPending} onClick={() => submitConsent(true)}>
          Allow
        </Button>
        <Button
          disabled={isPending}
          onClick={() => submitConsent(false)}
          variant="outline"
        >
          Deny
        </Button>
      </div>
    </div>
  );
}
