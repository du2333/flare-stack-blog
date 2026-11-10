import { useNavSort } from "./use-nav-sort";
import { SettingsDisclosure } from "./settings-disclosure";
import "./site-studio.css";
import {
  ExternalLink,
  GripVertical,
  Home,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { blogConfig } from "@/blog.config";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  FOCAL_POINT_CENTRE,
  focalObjectPosition,
  isFocalPointCentred,
  type FocalPoint,
} from "@/components/ui/focal-point";
import { FocalPointPicker } from "@/components/ui/focal-point-picker";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { OverlayUpload } from "@/features/config/components/admin/overlay-upload";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  BRAND_MARKS,
  PRIMARY_HUE_MAX,
  PRIMARY_HUE_MIN,
  TAGLINE_MAX,
  type BrandMark,
} from "@/features/config/site-config.schema";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  canonicalizeNavHref,
  isExternalNavHref,
  NAV_LINKS_MAX,
} from "@/features/config/utils/nav-links";
import {
  SOCIAL_PLATFORM_KEYS,
  SOCIAL_PLATFORMS,
} from "@/features/config/utils/social-platforms";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const IMAGE_ACCEPT = ".png,.webp,.jpg,.jpeg";
const ICON_ACCEPT = ".svg,.ico,.png,.webp";

const ICON_FIELDS = [
  {
    name: "site.icons.faviconSvg" as const,
    path: "favicon/favicon.svg",
    accept: ".svg",
    label: () => m.settings_site_field_favicon_svg(),
  },
  {
    name: "site.icons.faviconIco" as const,
    path: "favicon/favicon.ico",
    accept: ".ico",
    label: () => m.settings_site_field_favicon_ico(),
  },
  {
    name: "site.icons.favicon96" as const,
    path: "favicon/favicon-96x96.png",
    accept: ".png",
    label: () => m.settings_site_field_favicon_96(),
  },
  {
    name: "site.icons.appleTouchIcon" as const,
    path: "favicon/apple-touch-icon.png",
    accept: ".png",
    label: () => m.settings_site_field_apple_touch_icon(),
  },
  {
    name: "site.icons.webApp192" as const,
    path: "favicon/web-app-manifest-192x192.png",
    accept: ".png,.webp",
    label: () => m.settings_site_field_web_app_192(),
  },
  {
    name: "site.icons.webApp512" as const,
    path: "favicon/web-app-manifest-512x512.png",
    accept: ".png,.webp",
    label: () => m.settings_site_field_web_app_512(),
  },
];

function previewSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || /^https?:\/\//.test(trimmed)) return trimmed;
  return null;
}

const BRAND_MARK_LABELS: Record<BrandMark, () => string> = {
  default: () => m.settings_brand_mark_default(),
  siteIcon: () => m.settings_brand_mark_site_icon(),
  avatar: () => m.settings_brand_mark_avatar(),
  none: () => m.settings_brand_mark_none(),
};

const BRAND_MARK_SIZE = 28;
const BANNER_FOCUS_HINT_ID = "site-banner-focus-hint";

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

export function SiteStudio() {
  const { register, control, setValue } = useFormContext<SystemConfig>();
  const { focus, setFocus } = useBannerFocus();
  const title = useWatch({ control, name: "site.title" }) ?? "";
  const author = useWatch({ control, name: "site.author" }) ?? "";
  const banner = useWatch({ control, name: "site.bannerImage" });
  const avatar = useWatch({ control, name: "site.avatar" });
  const hueRaw = useWatch({ control, name: "site.primaryHue" });
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw)
      ? hueRaw
      : blogConfig.primaryHue;
  const bannerSrc = previewSrc(banner);
  const avatarSrc = previewSrc(avatar);

  return (
    <div className="site-studio">
      <section className="site-identity">
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
          <label className="site-title-edit">
            <input
              {...register("site.title")}
              className="site-inline-input"
              size={Math.min(28, Math.max(8, title.length * 2))}
              placeholder={m.settings_site_field_title_ph()}
              aria-label={m.settings_site_field_title()}
            />
            <Pencil size={17} aria-hidden="true" />
          </label>
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
        <div className="site-profile">
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
          <div className="site-profile-copy">
            <label className="site-author-edit">
              <input
                {...register("site.author")}
                className="site-inline-input"
                size={Math.min(24, Math.max(4, author.length * 2))}
                placeholder={m.settings_site_field_author_ph()}
                aria-label={m.settings_site_field_author()}
              />
              <Pencil size={15} aria-hidden="true" />
            </label>
            <label className="site-description-edit">
              <textarea
                {...register("site.description")}
                className="site-inline-input"
                rows={2}
                placeholder={m.settings_site_field_description_ph()}
                aria-label={m.settings_site_field_description()}
              />
              <Pencil size={14} aria-hidden="true" />
            </label>
            <SocialPills />
          </div>
        </div>
      </section>
      <BrandMarkRow title={title} avatarSrc={avatarSrc} />
      <TaglineRow />
      <BannerFocusRow />
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
            onChange={(event) =>
              setValue("site.primaryHue", Number(event.target.value), {
                shouldDirty: true,
              })
            }
            style={{
              background:
                "linear-gradient(to right, oklch(0.7 0.14 0), oklch(0.7 0.14 60), oklch(0.7 0.14 120), oklch(0.7 0.14 180), oklch(0.7 0.14 240), oklch(0.7 0.14 300), oklch(0.7 0.14 360))",
            }}
          />
          <output htmlFor="theme-hue-slider">{hue}°</output>
        </div>
      </section>
      <NavLinksEditor />
      <SettingsDisclosure
        className="site-icons"
        title={
          <span className="site-section-copy">
            <strong>{m.settings_icons()}</strong>
            <span className="site-section-hint">{m.settings_icons_hint()}</span>
          </span>
        }
      >
        <div className="site-icon-grid">
          {ICON_FIELDS.map((item) => (
            <IconTile key={item.name} {...item} />
          ))}
        </div>
      </SettingsDisclosure>
    </div>
  );
}

function BrandMarkRow({
  title,
  avatarSrc,
}: {
  title: string;
  avatarSrc: string | null;
}) {
  const { control, setValue } = useFormContext<SystemConfig>();
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

function NavLinksEditor() {
  const { control, register, setValue, watch, formState } =
    useFormContext<SystemConfig>();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "site.navLinks",
  });
  const linkErrors = formState.errors.site?.navLinks;
  const sorting = useNavSort(
    fields.map((field) => field.id),
    move,
  );

  return (
    <section className="site-nav-section">
      <div className="site-section-copy">
        <h2>{m.settings_site_nav_title()}</h2>
        <p className="mt-1 text-xs fuwari-text-50">
          {m.settings_site_nav_hint()}
        </p>
      </div>

      <p className="site-sort-hint">{m.settings_nav_drag_hint()}</p>
      <div className="site-nav-fields">
        {fields.map((field, index) => {
          const href = watch(`site.navLinks.${index}.href`) ?? "";
          const canonicalHref = canonicalizeNavHref(href);
          const labelError = linkErrors?.[index]?.label?.message;
          const hrefError = linkErrors?.[index]?.href?.message;
          return (
            <div
              key={field.id}
              ref={(node) => {
                if (node) sorting.rows.current.set(field.id, node);
                else sorting.rows.current.delete(field.id);
              }}
              className="site-nav-item space-y-1"
              data-dragging={sorting.drag?.id === field.id}
              data-drop-target={
                sorting.drag?.target === field.id &&
                sorting.drag?.id !== field.id
              }
              style={
                sorting.drag?.id === field.id
                  ? { transform: `translateY(${sorting.drag.offset}px)` }
                  : undefined
              }
            >
              <div className="site-nav-row">
                <button
                  type="button"
                  className="site-nav-handle"
                  {...sorting.handleProps(field.id)}
                  aria-label={m.settings_nav_drag_label({
                    name:
                      watch(`site.navLinks.${index}.label`) ||
                      String(index + 1),
                  })}
                  title={m.settings_nav_drag_hint()}
                  disabled={fields.length < 2}
                >
                  <GripVertical size={18} />
                </button>
                <Input
                  {...register(`site.navLinks.${index}.label`)}
                  placeholder={m.settings_site_nav_label_ph()}
                  aria-label={m.settings_site_nav_name()}
                />
                <div className="relative min-w-0 flex-1">
                  <Input
                    {...register(`site.navLinks.${index}.href`, {
                      onBlur: (event) => {
                        const next = canonicalizeNavHref(event.target.value);
                        if (next !== event.target.value) {
                          setValue(`site.navLinks.${index}.href`, next, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      },
                    })}
                    aria-label={m.settings_site_nav_url()}
                    placeholder={m.settings_site_nav_href_ph()}
                    className={cn(isExternalNavHref(canonicalHref) && "pr-10")}
                  />
                  {isExternalNavHref(canonicalHref) ? (
                    <ExternalLink
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fuwari-text-30"
                    />
                  ) : null}
                </div>
                <IconButton
                  size="md"
                  tone="danger"
                  onClick={() => remove(index)}
                  label={m.settings_site_nav_remove()}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
              {labelError || hrefError ? (
                <p className="fuwari-form-field-error">
                  {hrefError || labelError}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {fields.length < NAV_LINKS_MAX ? (
        <Button
          variant="text"
          size="sm"
          onClick={() => append({ label: "", href: "" })}
          icon={<Plus size={14} />}
          className="site-add-link"
        >
          {m.settings_site_nav_add()}
        </Button>
      ) : null}
    </section>
  );
}

function SocialPills() {
  const { control, register, watch, setValue } = useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.social",
  });
  const social = useWatch({ control, name: "site.social" }) ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const taken = (key: string, except: number) =>
    key !== "custom" &&
    social.some((item, index) => index !== except && item.platform === key);
  const unused = SOCIAL_PLATFORM_KEYS.filter(
    (key) => key === "custom" || !social.some((item) => item.platform === key),
  );

  return (
    <div className="site-social">
      <div className="site-social-actions">
        {fields.map((field, index) => {
          const platform = watch(`site.social.${index}.platform`);
          const preset =
            platform && platform !== "custom"
              ? SOCIAL_PLATFORMS[platform]
              : null;
          const Icon = preset?.icon;
          const iconSrc = watch(`site.social.${index}.icon`);
          return (
            <IconButton
              key={field.id}
              onClick={() =>
                setSelected((current) => (current === index ? null : index))
              }
              label={preset?.label ?? field.label ?? ""}
              aria-expanded={selected === index}
            >
              {Icon ? (
                <Icon size={18} strokeWidth={1.5} />
              ) : iconSrc ? (
                <img src={iconSrc} alt="" className="w-4 h-4" />
              ) : (
                <Plus size={16} />
              )}
            </IconButton>
          );
        })}
        {unused.length > 0 ? (
          <Button
            variant="text"
            size="sm"
            onClick={() => {
              const next = unused[0];
              if (!next) return;
              append({ platform: next, url: "" });
              setSelected(fields.length);
            }}
            icon={<Plus size={14} />}
          >
            {m.settings_social_add()}
          </Button>
        ) : null}
      </div>

      {selected !== null && fields[selected]
        ? (() => {
            const platform = watch(`site.social.${selected}.platform`);
            const urlPlaceholder =
              platform === "email"
                ? m.settings_social_email_ph()
                : platform === "rss"
                  ? m.settings_social_rss_ph()
                  : m.settings_social_url_ph();

            return (
              <div className="site-social-editor">
                <div className="flex gap-2">
                  <Select
                    className="w-36 shrink-0"
                    value={platform ?? ""}
                    onChange={(next) =>
                      setValue(
                        `site.social.${selected}.platform`,
                        next as (typeof SOCIAL_PLATFORM_KEYS)[number],
                        { shouldDirty: true },
                      )
                    }
                    options={SOCIAL_PLATFORM_KEYS.map((key) => ({
                      value: key,
                      label:
                        key === "custom"
                          ? m.settings_social_custom()
                          : SOCIAL_PLATFORMS[key].label,
                      disabled: taken(key, selected),
                    }))}
                  />
                  <Input
                    {...register(`site.social.${selected}.url`)}
                    placeholder={urlPlaceholder}
                  />
                  <IconButton
                    size="md"
                    tone="danger"
                    onClick={() => {
                      remove(selected);
                      setSelected(null);
                    }}
                    label={m.settings_social_remove()}
                  >
                    <X size={16} />
                  </IconButton>
                </div>
                {platform === "custom" ? (
                  <div className="flex gap-2">
                    <Input
                      {...register(`site.social.${selected}.label`)}
                      placeholder={m.settings_social_label_ph()}
                      className="w-36 shrink-0"
                    />
                    <OverlayUpload
                      name={`site.social.${selected}.icon`}
                      assetPath={`social/custom-${selected}`}
                      accept=".svg,.png,.webp"
                      variant="regular"
                      label={
                        watch(`site.social.${selected}.icon`)
                          ? m.settings_replace()
                          : m.settings_social_custom_icon_upload()
                      }
                    />
                  </div>
                ) : null}
              </div>
            );
          })()
        : null}
    </div>
  );
}

function IconTile({
  name,
  path,
  accept,
  label,
}: {
  name:
    | "site.icons.faviconSvg"
    | "site.icons.faviconIco"
    | "site.icons.favicon96"
    | "site.icons.appleTouchIcon"
    | "site.icons.webApp192"
    | "site.icons.webApp512";
  path: string;
  accept: string;
  label: () => string;
}) {
  const { watch } = useFormContext<SystemConfig>();
  const src = previewSrc(watch(name));
  return (
    <div className="space-y-1.5">
      <div className="relative group aspect-square rounded-xl overflow-hidden bg-(--fuwari-card-bg) border border-(--fuwari-input-border)">
        {src ? (
          <img src={src} alt="" className="w-full h-full object-contain p-2" />
        ) : null}
        <OverlayUpload
          name={name}
          assetPath={path}
          accept={accept || ICON_ACCEPT}
          className="absolute inset-x-1 bottom-1 justify-center"
        />
      </div>
      <p className="text-[11px] fuwari-text-50 truncate" title={label()}>
        {label()}
      </p>
    </div>
  );
}
