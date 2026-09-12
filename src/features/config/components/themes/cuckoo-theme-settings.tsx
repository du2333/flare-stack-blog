import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { AssetUploadField } from "@/features/config/components/asset-upload-field";
import {
  Field,
  RangeField,
} from "@/features/config/components/site-settings-fields";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  CUCKOO_THEME_HUE_MAX,
  CUCKOO_THEME_HUE_MIN,
} from "@/features/config/site-config.schema";
import { m } from "@/paraglide/messages";

export function CuckooThemeSettings() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SystemConfig>();

  return (
    <>
      <AssetUploadField
        name="site.theme.cuckoo.bg"
        assetPath="themes/cuckoo/bg.webp"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_field_home_image()}
        hint={m.settings_site_field_home_image_hint()}
        placeholder="/images/asset/themes/cuckoo/bg.webp or https://picsum.photos/1920/1080"
        error={errors.site?.theme?.cuckoo?.bg?.message}
      />
      <AssetUploadField
        name="site.theme.cuckoo.avatar"
        assetPath="themes/cuckoo/avatar.png"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_field_avatar()}
        error={errors.site?.theme?.cuckoo?.avatar?.message}
      />
      <AssetUploadField
        name="site.theme.cuckoo.sidebarBg"
        assetPath="themes/cuckoo/sidebar-bg.webp"
        accept=".png,.webp,.jpg,.jpeg"
        label={m.settings_site_field_sidebar_image_cuckoo()}
        hint={m.settings_site_field_home_image_hint()}
        placeholder="/images/asset/themes/cuckoo/sidebar-bg.webp or https://picsum.photos/640/240"
        error={errors.site?.theme?.cuckoo?.sidebarBg?.message}
      />
      <Field
        label={m.settings_site_field_default_cover_cuckoo()}
        hint={m.settings_site_field_default_cover_hint_cuckoo({
          slug: "{slug}",
        })}
        error={errors.site?.theme?.cuckoo?.defaultCover?.message}
      >
        <Input
          {...register("site.theme.cuckoo.defaultCover")}
          placeholder="https://picsum.photos/seed/{slug}/1200/630"
        />
      </Field>
      <RangeField
        name="site.theme.cuckoo.primaryHue"
        label={m.settings_site_field_primary_hue()}
        hint={m.settings_site_field_primary_hue_hint_cuckoo()}
        min={CUCKOO_THEME_HUE_MIN}
        max={CUCKOO_THEME_HUE_MAX}
        step={1}
        unit="deg"
        defaultValue={15}
        error={errors.site?.theme?.cuckoo?.primaryHue?.message}
      />
    </>
  );
}
