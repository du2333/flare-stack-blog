import { useNavSort } from "./use-nav-sort";
import { SettingsDisclosure } from "./settings-disclosure";
import "./site-studio.css";
import {
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Select } from "@/components/ui/select";
import { OverlayUpload } from "@/features/config/components/admin/overlay-upload";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  FUWARI_THEME_HUE_MAX,
  FUWARI_THEME_HUE_MIN,
} from "@/features/config/site-config.schema";
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

export function SiteStudio() {
  const { register, control, setValue } = useFormContext<SystemConfig>();
  const title = useWatch({ control, name: "site.title" }) ?? "";
  const author = useWatch({ control, name: "site.author" }) ?? "";
  const banner = useWatch({ control, name: "site.theme.fuwari.homeBg" });
  const avatar = useWatch({ control, name: "site.theme.fuwari.avatar" });
  const hueRaw = useWatch({ control, name: "site.theme.fuwari.primaryHue" });
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw) ? hueRaw : 250;
  const bannerSrc = previewSrc(banner);
  const avatarSrc = previewSrc(avatar);

  return (
    <div className="site-studio">
      <section className="site-identity">
        <div className="site-banner">
          {bannerSrc && (
            <img src={bannerSrc} alt="" className="site-banner-image" />
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
            name="site.theme.fuwari.homeBg"
            assetPath="themes/fuwari/home-bg.webp"
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
              name="site.theme.fuwari.avatar"
              assetPath="themes/fuwari/avatar.png"
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
      <section className="site-theme-row">
        <div className="site-section-copy">
          <label htmlFor="theme-hue-slider">{m.settings_hue()}</label>
          <p>{m.settings_hue_hint()}</p>
        </div>
        <div className="site-hue-control">
          <input
            id="theme-hue-slider"
            type="range"
            min={FUWARI_THEME_HUE_MIN}
            max={FUWARI_THEME_HUE_MAX}
            step={1}
            value={hue}
            onChange={(event) =>
              setValue(
                "site.theme.fuwari.primaryHue",
                Number(event.target.value),
                { shouldDirty: true },
              )
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
                <input
                  {...register(`site.navLinks.${index}.label`)}
                  placeholder={m.settings_site_nav_label_ph()}
                  aria-label={m.settings_site_nav_name()}
                  className={SETTINGS_FIELD_CLASS}
                />
                <div className="relative min-w-0 flex-1">
                  <input
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
                    className={cn(
                      SETTINGS_FIELD_CLASS,
                      isExternalNavHref(canonicalHref) && "pr-10",
                    )}
                  />
                  {isExternalNavHref(canonicalHref) ? (
                    <ExternalLink
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 fuwari-text-30"
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="h-10 w-10 rounded-xl fuwari-text-50 hover:text-(--fuwari-danger-fg) grid place-items-center shrink-0"
                  aria-label={m.settings_site_nav_remove()}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {labelError || hrefError ? (
                <p className="text-xs text-(--fuwari-danger-fg)">
                  {hrefError || labelError}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {fields.length < NAV_LINKS_MAX ? (
        <button
          type="button"
          onClick={() => append({ label: "", href: "" })}
          className="site-add-link"
        >
          <Plus size={14} />
          {m.settings_site_nav_add()}
        </button>
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
            <button
              key={field.id}
              type="button"
              onClick={() =>
                setSelected((current) => (current === index ? null : index))
              }
              className={cn("site-social-icon", selected === index && "active")}
              aria-label={preset?.label ?? field.label ?? ""}
              aria-expanded={selected === index}
            >
              {Icon ? (
                <Icon size={18} strokeWidth={1.5} />
              ) : iconSrc ? (
                <img src={iconSrc} alt="" className="w-4 h-4" />
              ) : (
                <Plus size={16} />
              )}
            </button>
          );
        })}
        {unused.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              const next = unused[0];
              if (!next) return;
              append({ platform: next, url: "" });
              setSelected(fields.length);
            }}
            className="site-add-link"
          >
            <Plus size={14} />
            {m.settings_social_add()}
          </button>
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
                  <input
                    {...register(`site.social.${selected}.url`)}
                    placeholder={urlPlaceholder}
                    className={SETTINGS_FIELD_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      remove(selected);
                      setSelected(null);
                    }}
                    className="h-10 w-10 rounded-xl fuwari-text-50 hover:text-(--fuwari-danger-fg) grid place-items-center shrink-0"
                    aria-label={m.settings_social_remove()}
                  >
                    <X size={16} />
                  </button>
                </div>
                {platform === "custom" ? (
                  <div className="flex gap-2">
                    <input
                      {...register(`site.social.${selected}.label`)}
                      placeholder={m.settings_social_label_ph()}
                      className={cn(SETTINGS_FIELD_CLASS, "w-36 shrink-0")}
                    />
                    <OverlayUpload
                      name={`site.social.${selected}.icon`}
                      assetPath={`social/custom-${selected}`}
                      accept=".svg,.png,.webp"
                      className="relative bg-(--fuwari-btn-regular-bg) text-(--fuwari-btn-content)"
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
