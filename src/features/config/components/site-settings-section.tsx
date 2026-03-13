import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border/30 bg-background/50 overflow-hidden">
      <div className="p-8 space-y-2 border-b border-border/20">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-8 grid gap-8 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

export function SiteSettingsSection() {
  const { register } = useFormContext<SystemConfig>();

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <SectionShell
        title={m.settings_site_section_basic_title()}
        description={m.settings_site_section_basic_desc()}
      >
        <Field
          label={m.settings_site_field_title()}
          hint={m.settings_site_field_title_hint()}
        >
          <Input
            {...register("site.title")}
            placeholder={m.settings_site_field_title_ph()}
          />
        </Field>
        <Field label={m.settings_site_field_author()}>
          <Input
            {...register("site.author")}
            placeholder={m.settings_site_field_author_ph()}
          />
        </Field>
        <Field
          label={m.settings_site_field_description()}
          hint={m.settings_site_field_description_hint()}
        >
          <Input
            {...register("site.description")}
            placeholder={m.settings_site_field_description_ph()}
          />
        </Field>
        <Field label={m.settings_site_field_github()}>
          <Input
            {...register("site.social.github")}
            placeholder={m.settings_site_field_github_ph()}
          />
        </Field>
        <Field label={m.settings_site_field_public_email()}>
          <Input
            {...register("site.social.email")}
            placeholder={m.settings_site_field_public_email_ph()}
          />
        </Field>
      </SectionShell>

      <SectionShell
        title={m.settings_site_section_theme_title()}
        description={m.settings_site_section_theme_desc({
          theme: __THEME_NAME__,
        })}
      >
        {__THEME_NAME__ === "default" ? (
          <>
            <Field
              label={m.settings_site_field_navbar_name()}
              hint={m.settings_site_field_navbar_name_hint()}
            >
              <Input
                {...register("site.theme.default.navBarName")}
                placeholder={m.settings_site_field_navbar_name_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_home_image()}
              hint={m.settings_site_field_home_image_hint()}
            >
              <Input
                {...register("site.theme.default.background.homeImage")}
                placeholder={m.settings_site_field_home_image_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_global_image()}
              hint={m.settings_site_field_global_image_hint()}
            >
              <Input
                {...register("site.theme.default.background.globalImage")}
                placeholder={m.settings_site_field_global_image_ph()}
              />
            </Field>
            <Field label={m.settings_site_field_light_opacity()}>
              <Input
                type="number"
                step="0.01"
                {...register("site.theme.default.background.light.opacity", {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label={m.settings_site_field_dark_opacity()}>
              <Input
                type="number"
                step="0.01"
                {...register("site.theme.default.background.dark.opacity", {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label={m.settings_site_field_backdrop_blur()}>
              <Input
                type="number"
                {...register("site.theme.default.background.backdropBlur", {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label={m.settings_site_field_transition_duration()}>
              <Input
                type="number"
                {...register(
                  "site.theme.default.background.transitionDuration",
                  {
                    valueAsNumber: true,
                  },
                )}
              />
            </Field>
          </>
        ) : null}

        {__THEME_NAME__ === "fuwari" ? (
          <>
            <Field
              label={m.settings_site_field_home_image()}
              hint={m.settings_site_field_home_image_hint()}
            >
              <Input
                {...register("site.theme.fuwari.homeBg")}
                placeholder={m.settings_site_field_home_image_ph()}
              />
            </Field>
            <Field label={m.settings_site_field_avatar()}>
              <Input
                {...register("site.theme.fuwari.avatar")}
                placeholder={m.settings_site_field_avatar_ph()}
              />
            </Field>
          </>
        ) : null}
      </SectionShell>
    </div>
  );
}
