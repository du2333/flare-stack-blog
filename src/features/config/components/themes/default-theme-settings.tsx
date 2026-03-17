import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import {
  Field,
  RangeField,
} from "@/features/config/components/site-settings-fields";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  DEFAULT_THEME_BLUR_MAX,
  DEFAULT_THEME_BLUR_MIN,
  DEFAULT_THEME_OPACITY_MAX,
  DEFAULT_THEME_OPACITY_MIN,
  DEFAULT_THEME_TRANSITION_MAX,
  DEFAULT_THEME_TRANSITION_MIN,
} from "@/features/config/site-config.schema";
import { m } from "@/paraglide/messages";

export function DefaultThemeSettings() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SystemConfig>();

  const getInputClassName = (error?: string) =>
    error ? "border-destructive focus-visible:border-destructive" : undefined;

  return (
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
        label={m.settings_site_field_home_image()}
        hint={m.settings_site_field_home_image_hint()}
        placeholder="/images/asset/themes/default/home-image.webp or https://picsum.photos/1600/900"
        error={errors.site?.theme?.default?.background?.homeImage?.message}
      />
      <AssetUploadField
        name="site.theme.default.background.globalImage"
        assetPath="themes/default/global-image.webp"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_field_global_image()}
        hint={m.settings_site_field_global_image_hint()}
        placeholder="/images/asset/themes/default/global-image.webp or https://picsum.photos/1600/900"
        error={errors.site?.theme?.default?.background?.globalImage?.message}
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
        error={errors.site?.theme?.default?.background?.light?.opacity?.message}
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
        error={errors.site?.theme?.default?.background?.dark?.opacity?.message}
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
        error={errors.site?.theme?.default?.background?.backdropBlur?.message}
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
          errors.site?.theme?.default?.background?.transitionDuration?.message
        }
      />
    </>
  );
}
