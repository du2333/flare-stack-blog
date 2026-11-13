import { ClientOnly, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/paraglide/messages";
import { AuthHeading } from "./auth-elements";
import "./auth-pages.css";

// The form brings react-hook-form, and almost no visitor ever sees the gate,
// so the form loads when the gate opens.
const PublicNameForm = lazy(() =>
  import("./public-name-form").then((module) => ({
    default: module.PublicNameForm,
  })),
);

interface NameGateProps {
  user: { name: string } | undefined;
  logout: () => Promise<void>;
}

/**
 * Blocks the site for a signed-in User who has no public name yet, such as
 * one who left the sign-in before the name step. The sign-in page asks for
 * the name itself, so the gate stays out of its way.
 */
export function NameGate({ user, logout }: NameGateProps) {
  const onAuthPage = useRouterState({
    select: (state) =>
      state.matches.some((match) => match.routeId.includes("/_auth")),
  });
  const open = !!user && !user.name.trim() && !onAuthPage;

  return (
    <ClientOnly>
      <FuwariModal open={open} onClose={() => {}} label={m.name_gate_title()}>
        <div className="auth-page name-gate">
          <AuthHeading
            title={m.name_gate_title()}
            description={m.name_gate_desc()}
          />
          {open ? (
            <Suspense fallback={<Skeleton className="h-40" />}>
              <PublicNameForm />
            </Suspense>
          ) : null}
          <Button variant="text" onClick={() => void logout()}>
            {m.profile_logout_fuwari()}
          </Button>
        </div>
      </FuwariModal>
    </ClientOnly>
  );
}
