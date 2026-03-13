import { type FieldPath, useController, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  DEFAULT_THEME_BLUR_MAX,
  DEFAULT_THEME_BLUR_MIN,
  DEFAULT_THEME_OPACITY_MAX,
  DEFAULT_THEME_OPACITY_MIN,
  DEFAULT_THEME_TRANSITION_MAX,
  DEFAULT_THEME_TRANSITION_MIN,
} from "@/features/config/site-config.schema";
import { cn } from "@/lib/utils";
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
      <div className="space-y-1 min-h-10 flex flex-col justify-end">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : (
          <div className="h-4" /> // Spacer for alignment
        )}
      </div>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

function RangeField({
  name,
  label,
  hint,
  error,
  min,
  max,
  step,
  unit,
  defaultValue,
  formatValue,
}: {
  name: FieldPath<SystemConfig>;
  label: string;
  hint?: string;
  error?: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  defaultValue: number;
  formatValue?: (value: number) => string;
}) {
  const { control } = useFormContext<SystemConfig>();
  const { field } = useController({
    control,
    name,
  });

  const currentValue =
    typeof field.value === "number" && !Number.isNaN(field.value)
      ? field.value
      : defaultValue;

  return (
    <label className="space-y-3">
      <div className="space-y-1">
        <div className="flex min-h-5 items-end">
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
        {hint ? (
          <p className="min-h-10 text-xs leading-5 text-muted-foreground">
            {hint}
          </p>
        ) : (
          <div className="h-10" />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            {min}
            {unit}
            {" - "}
            {max}
            {unit}
          </div>
          <div className="min-w-18 border border-border/40 bg-muted/20 px-3 py-1 text-right text-xs font-mono text-foreground">
            {formatValue
              ? formatValue(currentValue)
              : `${currentValue}${unit ?? ""}`}
          </div>
        </div>

        <input
          ref={field.ref}
          type="range"
          name={field.name}
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(Number(event.target.value))}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted/50 accent-foreground",
            error && "accent-destructive",
          )}
        />
      </div>
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
        title={m.settings_site_section_basic_title()}
        description={m.settings_site_section_basic_desc()}
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
          <Textarea
            {...register("site.description")}
            className={getInputClassName(errors.site?.description?.message)}
            placeholder={m.settings_site_field_description_ph()}
          />
        </Field>
      </SectionShell>

      <SectionShell
        title={m.settings_site_section_social_title()}
        description={m.settings_site_section_social_desc()}
      >
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
        title={m.settings_site_section_icons_title()}
        description={m.settings_site_section_icons_desc()}
      >
        <AssetUploadField
          name="site.icons.faviconSvg"
          assetPath="favicon/favicon.svg"
          accept=".svg"
          readOnly
          label={m.settings_site_field_favicon_svg()}
          error={errors.site?.icons?.faviconSvg?.message}
        />
        <AssetUploadField
          name="site.icons.faviconIco"
          assetPath="favicon/favicon.ico"
          accept=".ico"
          readOnly
          label={m.settings_site_field_favicon_ico()}
          error={errors.site?.icons?.faviconIco?.message}
        />
        <AssetUploadField
          name="site.icons.favicon96"
          assetPath="favicon/favicon-96x96.png"
          accept=".png"
          readOnly
          label={m.settings_site_field_favicon_96()}
          error={errors.site?.icons?.favicon96?.message}
        />
        <AssetUploadField
          name="site.icons.appleTouchIcon"
          assetPath="favicon/apple-touch-icon.png"
          accept=".png"
          readOnly
          label={m.settings_site_field_apple_touch_icon()}
          error={errors.site?.icons?.appleTouchIcon?.message}
        />
        <AssetUploadField
          name="site.icons.webApp192"
          assetPath="favicon/web-app-manifest-192x192.png"
          accept=".png,.webp"
          readOnly
          label={m.settings_site_field_web_app_192()}
          error={errors.site?.icons?.webApp192?.message}
        />
        <AssetUploadField
          name="site.icons.webApp512"
          assetPath="favicon/web-app-manifest-512x512.png"
          accept=".png,.webp"
          readOnly
          label={m.settings_site_field_web_app_512()}
          error={errors.site?.icons?.webApp512?.message}
        />
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
            <AssetUploadField
              name="site.theme.default.background.homeImage"
              assetPath="themes/default/home-image.webp"
              accept=".png,.webp,.jpg,.jpeg"
              readOnly
              label={m.settings_site_field_home_image()}
              hint={m.settings_site_field_home_image_hint()}
              error={
                errors.site?.theme?.default?.background?.homeImage?.message
              }
            />
            <AssetUploadField
              name="site.theme.default.background.globalImage"
              assetPath="themes/default/global-image.webp"
              accept=".png,.webp,.jpg,.jpeg"
              readOnly
              label={m.settings_site_field_global_image()}
              hint={m.settings_site_field_global_image_hint()}
              error={
                errors.site?.theme?.default?.background?.globalImage?.message
              }
            />
            <RangeField
              name="site.theme.default.background.light.opacity"
              label={m.settings_site_field_light_opacity()}
              hint={m.settings_site_field_light_opacity_hint()}
              min={DEFAULT_THEME_OPACITY_MIN}
              max={DEFAULT_THEME_OPACITY_MAX}
              step={0.01}
              defaultValue={0.15}
              formatValue={(value) => value.toFixed(2)}
              error={
                errors.site?.theme?.default?.background?.light?.opacity?.message
              }
            />
            <RangeField
              name="site.theme.default.background.dark.opacity"
              label={m.settings_site_field_dark_opacity()}
              hint={m.settings_site_field_dark_opacity_hint()}
              min={DEFAULT_THEME_OPACITY_MIN}
              max={DEFAULT_THEME_OPACITY_MAX}
              step={0.01}
              defaultValue={0.1}
              formatValue={(value) => value.toFixed(2)}
              error={
                errors.site?.theme?.default?.background?.dark?.opacity?.message
              }
            />
            <RangeField
              name="site.theme.default.background.backdropBlur"
              label={m.settings_site_field_backdrop_blur()}
              hint={m.settings_site_field_backdrop_blur_hint()}
              min={DEFAULT_THEME_BLUR_MIN}
              max={DEFAULT_THEME_BLUR_MAX}
              step={1}
              unit="px"
              defaultValue={8}
              error={
                errors.site?.theme?.default?.background?.backdropBlur?.message
              }
            />
            <RangeField
              name="site.theme.default.background.transitionDuration"
              label={m.settings_site_field_transition_duration()}
              hint={m.settings_site_field_transition_duration_hint()}
              min={DEFAULT_THEME_TRANSITION_MIN}
              max={DEFAULT_THEME_TRANSITION_MAX}
              step={50}
              unit="ms"
              defaultValue={600}
              error={
                errors.site?.theme?.default?.background?.transitionDuration
                  ?.message
              }
            />
          </>
        ) : null}

        {__THEME_NAME__ === "fuwari" ? (
          <>
            <AssetUploadField
              name="site.theme.fuwari.homeBg"
              assetPath="themes/fuwari/home-bg.webp"
              accept=".png,.webp,.jpg,.jpeg"
              readOnly
              label={m.settings_site_field_home_image()}
              hint={m.settings_site_field_home_image_hint()}
              error={errors.site?.theme?.fuwari?.homeBg?.message}
            />
            <AssetUploadField
              name="site.theme.fuwari.avatar"
              assetPath="themes/fuwari/avatar.png"
              accept=".png,.webp,.jpg,.jpeg"
              readOnly
              label={m.settings_site_field_avatar()}
              error={errors.site?.theme?.fuwari?.avatar?.message}
            />
          </>
        ) : null}
      </SectionShell>
    </div>
  );
}
