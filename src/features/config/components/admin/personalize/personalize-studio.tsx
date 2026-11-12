import "../site-studio.css";
import "./personalize.css";
import { Eye, Home, UserRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { blogConfig } from "@/blog.config";
import { Button } from "@/components/ui/button";
import {
  FOCAL_POINT_CENTRE,
  focalObjectPosition,
  isFocalPointCentred,
  type FocalPoint,
} from "@/components/ui/focal-point";
import { FocalPointPicker } from "@/components/ui/focal-point-picker";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { OverlayUpload } from "@/features/config/components/admin/overlay-upload";
import { previewSrc } from "@/features/config/components/admin/preview-src";
import { ThemePicker } from "@/features/config/components/admin/theme-picker";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  BRAND_MARKS,
  PRIMARY_HUE_MAX,
  PRIMARY_HUE_MIN,
  TAGLINE_MAX,
  type BrandMark,
} from "@/features/config/site-config.schema";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import { resolveThemeOptions, selectTheme } from "@/features/theme/themes";
import { useMediaQuery } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import type { PreviewValues } from "./preview-address";
import { PreviewPanel } from "./preview-panel";
import { useAsideRoom } from "./use-aside-room";

const IMAGE_ACCEPT = ".png,.webp,.jpg,.jpeg";

const BRAND_MARK_LABELS: Record<BrandMark, () => string> = {
  default: () => m.settings_brand_mark_default(),
  siteIcon: () => m.settings_brand_mark_site_icon(),
  avatar: () => m.settings_brand_mark_avatar(),
  none: () => m.settings_brand_mark_none(),
};

const BRAND_MARK_SIZE = 28;
const BANNER_FOCUS_HINT_ID = "site-banner-focus-hint";

/** From this width the preview sits beside the form; below it is a button. */
const WIDE_PREVIEW_QUERY = "(min-width: 1320px)";

function useBannerFocus() {
  const { control, setValue } = useFormContext<SystemConfig>();
  const watched = useWatch({ control, name: "site.bannerFocus" });
  const focus: FocalPoint =
    typeof watched?.x === "number" && typeof watched.y === "number"
      ? { x: watched.x, y: watched.y }
      : FOCAL_POINT_CENTRE;
  const setFocus = (next: FocalPoint) =>
    setValue("site.bannerFocus", next, { shouldDirty: true });
  return { focus, setFocus };
}

function useHue() {
  const { control, setValue } = useFormContext<SystemConfig>();
  const raw = useWatch({ control, name: "site.primaryHue" });
  const hue =
    typeof raw === "number" && !Number.isNaN(raw) ? raw : blogConfig.primaryHue;
  const setHue = (next: number) =>
    setValue("site.primaryHue", next, { shouldDirty: true });
  return { hue, setHue };
}

/** What the preview shows: the presentation fields as they stand in the form. */
function usePreviewValues(): PreviewValues {
  const { control } = useFormContext<SystemConfig>();
  const site = useWatch({ control, name: "site" });
  const { focus } = useBannerFocus();
  const { hue } = useHue();
  const theme = selectTheme(site?.theme?.id ?? "");
  return {
    themeId: theme.id,
    themeOptions: resolveThemeOptions(theme, site?.theme?.options?.[theme.id]),
    bannerImage: site?.bannerImage ?? "",
    bannerFocus: focus,
    avatar: site?.avatar ?? "",
    primaryHue: hue,
    brandMark: site?.brandMark ?? blogConfig.brandMark,
    tagline: site?.tagline ?? "",
  };
}

/**
 * 「个性化」: the presentation settings of Site Config, with the real public
 * page beside them. The form is the same one the settings pages use; this page
 * owns the presentation fields of it.
 */
export function PersonalizeStudio() {
  const values = usePreviewValues();
  const wide = useMediaQuery(WIDE_PREVIEW_QUERY);

  return (
    <div className="personalize" data-wide={wide || undefined}>
      {wide ? null : <PreviewLauncher values={values} />}
      <div className="personalize-form">
        <ThemePicker />
        <BannerRow />
        <BannerFocusRow />
        <AvatarRow />
        <HueRow />
        <BrandMarkRow />
        <TaglineRow />
      </div>
      {wide ? <PreviewAside values={values} /> : null}
    </div>
  );
}

/** Beside the form, in view while it scrolls, as tall as the page has room for. */
function PreviewAside({ values }: { values: PreviewValues }) {
  const ref = useRef<HTMLElement>(null);
  useAsideRoom(ref);
  return (
    <aside ref={ref} className="personalize-aside">
      <PreviewPanel values={values} initialDevice="desktop" />
    </aside>
  );
}

/** On a narrow screen: a button that opens the preview over the whole screen. */
function PreviewLauncher({ values }: { values: PreviewValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="personalize-launcher">
        <Button
          icon={<Eye size={16} aria-hidden="true" />}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {m.personalize_preview_open()}
        </Button>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        className="personalize-sheet"
        aria-label={m.personalize_preview_heading()}
      >
        {open ? (
          <PreviewPanel
            values={values}
            initialDevice="phone"
            actions={
              <IconButton
                className="personalize-close"
                onClick={() => setOpen(false)}
                label={m.personalize_preview_close()}
              >
                <X size={18} />
              </IconButton>
            }
          />
        ) : null}
      </Sheet>
    </>
  );
}

function BannerRow() {
  const { control } = useFormContext<SystemConfig>();
  const { focus, setFocus } = useBannerFocus();
  const banner = useWatch({ control, name: "site.bannerImage" });
  const bannerSrc = previewSrc(banner);

  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong>{m.personalize_banner()}</strong>
        <p>{m.personalize_banner_hint()}</p>
      </div>
      <div className="site-banner">
        {bannerSrc && (
          <img
            src={bannerSrc}
            alt=""
            className="site-banner-image"
            style={{ objectPosition: focalObjectPosition(focus) }}
          />
        )}
        {bannerSrc && (
          <FocalPointPicker
            value={focus}
            onValueChange={setFocus}
            label={m.settings_banner_focus()}
            valueText={m.settings_banner_focus_value(focus)}
            describedBy={BANNER_FOCUS_HINT_ID}
          />
        )}
        <OverlayUpload
          name="site.bannerImage"
          assetPath="site/banner.webp"
          accept={IMAGE_ACCEPT}
          className="site-banner-upload"
          label={
            bannerSrc
              ? m.settings_site_banner_replace()
              : m.settings_site_banner_upload()
          }
        />
      </div>
    </section>
  );
}

function BannerFocusRow() {
  const { focus, setFocus } = useBannerFocus();
  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong>{m.settings_banner_focus()}</strong>
        <p id={BANNER_FOCUS_HINT_ID}>{m.settings_banner_focus_hint()}</p>
      </div>
      <div className="site-focus-control">
        <output>{`${focus.x}%, ${focus.y}%`}</output>
        <Button
          variant="regular"
          size="sm"
          disabled={isFocalPointCentred(focus)}
          onClick={() => setFocus({ ...FOCAL_POINT_CENTRE })}
        >
          {m.settings_banner_focus_reset()}
        </Button>
      </div>
    </section>
  );
}

function AvatarRow() {
  const { control } = useFormContext<SystemConfig>();
  const avatarSrc = previewSrc(useWatch({ control, name: "site.avatar" }));

  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong>{m.personalize_avatar()}</strong>
        <p>{m.personalize_avatar_hint()}</p>
      </div>
      <div className="site-avatar-edit">
        <div className="site-avatar">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" />
          ) : (
            <UserRound size={38} aria-hidden="true" />
          )}
        </div>
        <OverlayUpload
          name="site.avatar"
          assetPath="site/avatar.png"
          accept={IMAGE_ACCEPT}
          className="site-avatar-upload"
          label={
            avatarSrc
              ? m.settings_site_avatar_replace()
              : m.settings_site_avatar_upload()
          }
        />
      </div>
    </section>
  );
}

function HueRow() {
  const { hue, setHue } = useHue();
  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <label htmlFor="theme-hue-slider">{m.settings_hue()}</label>
        <p>{m.settings_hue_hint()}</p>
      </div>
      <div className="site-hue-control">
        <input
          id="theme-hue-slider"
          type="range"
          min={PRIMARY_HUE_MIN}
          max={PRIMARY_HUE_MAX}
          step={1}
          value={hue}
          onChange={(event) => setHue(Number(event.target.value))}
          style={{
            background:
              "linear-gradient(to right, oklch(0.7 0.14 0), oklch(0.7 0.14 60), oklch(0.7 0.14 120), oklch(0.7 0.14 180), oklch(0.7 0.14 240), oklch(0.7 0.14 300), oklch(0.7 0.14 360))",
          }}
        />
        <output htmlFor="theme-hue-slider">{hue}°</output>
      </div>
    </section>
  );
}

function BrandMarkRow() {
  const { control, setValue } = useFormContext<SystemConfig>();
  const title = useWatch({ control, name: "site.title" }) ?? "";
  const avatarSrc = previewSrc(useWatch({ control, name: "site.avatar" }));
  const brandMark =
    useWatch({ control, name: "site.brandMark" }) ?? blogConfig.brandMark;
  const faviconSvg = useWatch({ control, name: "site.icons.faviconSvg" });
  const favicon96 = useWatch({ control, name: "site.icons.favicon96" });
  const image = resolveBrandMarkImage(brandMark, {
    avatar: avatarSrc ?? "",
    icons: {
      faviconSvg: previewSrc(faviconSvg) ?? "",
      favicon96: previewSrc(favicon96) ?? "",
    },
  });

  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong id="site-brand-mark-label">{m.settings_brand_mark()}</strong>
        <p id="site-brand-mark-hint">{m.settings_brand_mark_hint()}</p>
      </div>
      <div className="site-brand-control">
        <SegmentedControl
          className="site-brand-choice"
          size="sm"
          aria-labelledby="site-brand-mark-label"
          aria-describedby="site-brand-mark-hint"
          items={BRAND_MARKS.map((value) => ({
            value,
            label: BRAND_MARK_LABELS[value](),
          }))}
          value={brandMark}
          onValueChange={(next) =>
            setValue("site.brandMark", next, { shouldDirty: true })
          }
        />
        <div className="site-brand-preview" aria-hidden="true">
          {brandMark === "none" ? null : image ? (
            <img src={image.src} alt="" data-mark={image.kind} />
          ) : (
            <Home size={BRAND_MARK_SIZE} strokeWidth={1.5} />
          )}
          <span>{title}</span>
        </div>
      </div>
    </section>
  );
}

function TaglineRow() {
  const { register, formState } = useFormContext<SystemConfig>();
  const error = formState.errors.site?.tagline?.message;
  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <label htmlFor="site-tagline">{m.settings_tagline()}</label>
        <p>{m.settings_tagline_hint()}</p>
      </div>
      <div className="site-tagline-control">
        <Input
          id="site-tagline"
          {...register("site.tagline")}
          maxLength={TAGLINE_MAX}
          placeholder={m.settings_tagline_ph()}
          aria-invalid={error ? true : undefined}
        />
        {error ? <p className="fuwari-form-field-error">{error}</p> : null}
      </div>
    </section>
  );
}
