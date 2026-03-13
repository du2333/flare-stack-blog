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
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

export function SiteSettingsSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SystemConfig>();

  const getInputClassName = (error?: string) =>
    error ? "border-destructive focus-visible:border-destructive" : undefined;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <SectionShell
        title={m.settings_site_section_site_title()}
        description={m.settings_site_section_site_desc()}
      >
        <Field
          label={m.settings_site_field_title()}
          hint={m.settings_site_field_title_hint()}
          error={errors.site?.title?.message}
        >
          <Input
            {...register("site.title")}
            className={getInputClassName(errors.site?.title?.message)}
            placeholder={m.settings_site_field_title_ph()}
          />
        </Field>
        <Field
          label={m.settings_site_field_author()}
          error={errors.site?.author?.message}
        >
          <Input
            {...register("site.author")}
            className={getInputClassName(errors.site?.author?.message)}
            placeholder={m.settings_site_field_author_ph()}
          />
        </Field>
        <Field
          label={m.settings_site_field_description()}
          hint={m.settings_site_field_description_hint()}
          error={errors.site?.description?.message}
        >
          <Input
            {...register("site.description")}
            className={getInputClassName(errors.site?.description?.message)}
            placeholder={m.settings_site_field_description_ph()}
          />
        </Field>
        <Field
          label={m.settings_site_field_github()}
          error={errors.site?.social?.github?.message}
        >
          <Input
            {...register("site.social.github")}
            className={getInputClassName(errors.site?.social?.github?.message)}
            placeholder={m.settings_site_field_github_ph()}
          />
        </Field>
        <Field
          label={m.settings_site_field_public_email()}
          error={errors.site?.social?.email?.message}
        >
          <Input
            {...register("site.social.email")}
            className={getInputClassName(errors.site?.social?.email?.message)}
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
              error={errors.site?.theme?.default?.navBarName?.message}
            >
              <Input
                {...register("site.theme.default.navBarName")}
                className={getInputClassName(
                  errors.site?.theme?.default?.navBarName?.message,
                )}
                placeholder={m.settings_site_field_navbar_name_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_home_image()}
              hint={m.settings_site_field_home_image_hint()}
              error={
                errors.site?.theme?.default?.background?.homeImage?.message
              }
            >
              <Input
                {...register("site.theme.default.background.homeImage")}
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.homeImage?.message,
                )}
                placeholder={m.settings_site_field_home_image_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_global_image()}
              hint={m.settings_site_field_global_image_hint()}
              error={
                errors.site?.theme?.default?.background?.globalImage?.message
              }
            >
              <Input
                {...register("site.theme.default.background.globalImage")}
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.globalImage?.message,
                )}
                placeholder={m.settings_site_field_global_image_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_light_opacity()}
              error={
                errors.site?.theme?.default?.background?.light?.opacity?.message
              }
            >
              <Input
                type="number"
                step="0.01"
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.light?.opacity
                    ?.message,
                )}
                {...register("site.theme.default.background.light.opacity", {
                  setValueAs: (value) =>
                    value === "" || value == null ? undefined : Number(value),
                })}
              />
            </Field>
            <Field
              label={m.settings_site_field_dark_opacity()}
              error={
                errors.site?.theme?.default?.background?.dark?.opacity?.message
              }
            >
              <Input
                type="number"
                step="0.01"
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.dark?.opacity
                    ?.message,
                )}
                {...register("site.theme.default.background.dark.opacity", {
                  setValueAs: (value) =>
                    value === "" || value == null ? undefined : Number(value),
                })}
              />
            </Field>
            <Field
              label={m.settings_site_field_backdrop_blur()}
              error={
                errors.site?.theme?.default?.background?.backdropBlur?.message
              }
            >
              <Input
                type="number"
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.backdropBlur
                    ?.message,
                )}
                {...register("site.theme.default.background.backdropBlur", {
                  setValueAs: (value) =>
                    value === "" || value == null ? undefined : Number(value),
                })}
              />
            </Field>
            <Field
              label={m.settings_site_field_transition_duration()}
              error={
                errors.site?.theme?.default?.background?.transitionDuration
                  ?.message
              }
            >
              <Input
                type="number"
                className={getInputClassName(
                  errors.site?.theme?.default?.background?.transitionDuration
                    ?.message,
                )}
                {...register(
                  "site.theme.default.background.transitionDuration",
                  {
                    setValueAs: (value) =>
                      value === "" || value == null ? undefined : Number(value),
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
              error={errors.site?.theme?.fuwari?.homeBg?.message}
            >
              <Input
                {...register("site.theme.fuwari.homeBg")}
                className={getInputClassName(
                  errors.site?.theme?.fuwari?.homeBg?.message,
                )}
                placeholder={m.settings_site_field_home_image_ph()}
              />
            </Field>
            <Field
              label={m.settings_site_field_avatar()}
              error={errors.site?.theme?.fuwari?.avatar?.message}
            >
              <Input
                {...register("site.theme.fuwari.avatar")}
                className={getInputClassName(
                  errors.site?.theme?.fuwari?.avatar?.message,
                )}
                placeholder={m.settings_site_field_avatar_ph()}
              />
            </Field>
          </>
        ) : null}
      </SectionShell>
    </div>
  );
}
