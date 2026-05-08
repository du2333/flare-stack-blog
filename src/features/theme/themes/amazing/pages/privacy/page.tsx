import { useRouteContext } from "@tanstack/react-router";
import type { PrivacyPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function PrivacyPage(_: PrivacyPageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const siteName = siteConfig.title;

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.privacy_heading()}
        </h1>
        <p className="text-sm text-muted-foreground font-mono">
          {m.privacy_last_updated()}
          {"2026-05-07"}
        </p>
      </header>

      <div className="space-y-12 text-base leading-relaxed">
        <p className="text-muted-foreground">
          {m.privacy_intro({ siteName })}
        </p>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_info_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_info_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_cookies_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_cookies_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_ads_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_ads_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_data_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_data_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_rights_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_rights_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.privacy_section_changes_title()}
          </h2>
          <p className="text-muted-foreground">
            {m.privacy_section_changes_text()}
          </p>
        </section>
      </div>
    </div>
  );
}
