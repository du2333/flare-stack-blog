import { useRouteContext } from "@tanstack/react-router";
import type { AboutPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

export function AboutPage(_: AboutPageProps) {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const siteName = siteConfig.title;

  return (
    <div className="w-full max-w-3xl mx-auto pb-20 px-6 md:px-0">
      <header className="py-12 md:py-20 space-y-6">
        <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
          {m.about_heading()}
        </h1>
        <p className="max-w-xl text-base md:text-lg font-light text-muted-foreground leading-relaxed">
          {m.about_intro({ siteName })}
        </p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.about_section_purpose_title()}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {m.about_section_purpose_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.about_section_author_title()}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {m.about_section_author_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.about_section_tech_title()}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {m.about_section_tech_text()}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-serif font-medium text-foreground mb-4">
            {m.about_section_contact_title()}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {m.about_section_contact_text()}
          </p>
        </section>
      </div>
    </div>
  );
}
