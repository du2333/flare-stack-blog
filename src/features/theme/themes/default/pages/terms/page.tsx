import { useRouteContext } from "@tanstack/react-router";
import type { TermsPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function TermsPage(_: TermsPageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const siteName = siteConfig.title;

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.terms_heading()}
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {m.terms_last_updated()}
          {"2026-05-07"}
        </p>
      </header>

      <div className="space-y-12 text-base leading-relaxed">
        <p className="text-muted-foreground">
          {m.terms_intro({ siteName })}
        </p>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_use_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_use_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_content_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_content_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_accounts_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_accounts_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_third_party_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_third_party_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_disclaimer_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_disclaimer_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.terms_section_changes_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.terms_section_changes_text()}
          </p>
        </section>
      </div>
    </div>
  );
}
