import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import { Field } from "@/features/config/components/site-settings-fields";
import { DefaultThemeSettings } from "@/features/config/components/themes/default-theme-settings";
import { FuwariThemeSettings } from "@/features/config/components/themes/fuwari-theme-settings";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";

function ThemeSettingsContent() {
  switch (__THEME_NAME__) {
    case "default":
      return <DefaultThemeSettings />;
    case "fuwari":
      return <FuwariThemeSettings />;
    default: {
      __THEME_NAME__ satisfies never;
      return null;
    }
  }
}

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
        <ThemeSettingsContent />
      </SectionShell>
    </div>
  );
}
