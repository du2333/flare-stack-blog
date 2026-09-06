import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Home, Plus, X } from "lucide-react";
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
import { recentPostsQuery } from "@/features/posts/queries";
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
  const description = useWatch({ control, name: "site.description" }) ?? "";
  const banner = useWatch({ control, name: "site.theme.fuwari.homeBg" });
  const avatar = useWatch({ control, name: "site.theme.fuwari.avatar" });
  const hueRaw = useWatch({ control, name: "site.theme.fuwari.primaryHue" });
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw) ? hueRaw : 250;
  const bannerSrc = previewSrc(banner);
  const avatarSrc = previewSrc(avatar);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="relative h-52 md:h-72 rounded-2xl overflow-hidden bg-(--fuwari-btn-regular-bg)">
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt=""
              className="w-full h-full object-cover object-center"
            />
          ) : null}
          <div className="absolute top-3 left-3 flex items-center gap-2 h-10 px-3 rounded-xl bg-white/90 dark:bg-black/50 backdrop-blur-sm max-w-[min(100%-1.5rem,20rem)] shadow-xs">
            <Home
              size={16}
              strokeWidth={1.5}
              className="text-(--fuwari-primary) shrink-0"
            />
            <input
              {...register("site.title")}
              placeholder={m.settings_site_field_title_ph()}
              aria-label={m.settings_site_field_title()}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium fuwari-text-90 outline-none"
            />
          </div>
          <OverlayUpload
            name="site.theme.fuwari.homeBg"
            assetPath="themes/fuwari/home-bg.webp"
            accept={IMAGE_ACCEPT}
            className="absolute top-3 right-3"
            label={
              bannerSrc
                ? m.settings_site_banner_replace()
                : m.settings_site_banner_upload()
            }
          />
        </div>

        <div className="relative -mt-14 md:-mt-16 px-3 md:px-5 flex flex-col md:flex-row md:items-end gap-4">
          <div className="relative w-24 h-24 shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-(--fuwari-card-bg) bg-(--fuwari-btn-regular-bg)">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <OverlayUpload
              name="site.theme.fuwari.avatar"
              assetPath="themes/fuwari/avatar.png"
              accept={IMAGE_ACCEPT}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2"
              label={
                avatarSrc
                  ? m.settings_site_avatar_replace()
                  : m.settings_site_avatar_upload()
              }
            />
          </div>

          <div className="fuwari-card-base flex-1 min-w-0 p-4 space-y-3 shadow-sm">
            <input
              {...register("site.author")}
              placeholder={m.settings_site_field_author_ph()}
              aria-label={m.settings_site_field_author()}
              className="w-full bg-transparent text-xl font-medium fuwari-text-90 outline-none"
            />
            <textarea
              {...register("site.description")}
              rows={2}
              placeholder={m.settings_site_field_description_ph()}
              aria-label={m.settings_site_field_description()}
              className="w-full bg-transparent text-sm fuwari-text-50 outline-none resize-none leading-relaxed"
            />
            <SocialPills />
          </div>

          <StudioPost
            fallbackTitle={title || author}
            fallbackSummary={description}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="theme-hue-slider"
            className="text-sm font-medium fuwari-text-75"
          >
            {m.settings_hue()}
          </label>
          <span className="text-xs font-mono fuwari-text-50">{hue}°</span>
        </div>
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
              {
                shouldDirty: true,
              },
            )
          }
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-(--fuwari-primary)"
          style={{
            background:
              "linear-gradient(to right, oklch(0.7 0.14 0), oklch(0.7 0.14 60), oklch(0.7 0.14 120), oklch(0.7 0.14 180), oklch(0.7 0.14 240), oklch(0.7 0.14 300), oklch(0.7 0.14 360))",
          }}
        />
        <p className="text-xs fuwari-text-50">{m.settings_hue_hint()}</p>
      </div>

      <NavLinksEditor />

      <details className="rounded-2xl bg-(--fuwari-btn-regular-bg)/60 p-4 space-y-3">
        <summary className="text-sm font-medium fuwari-text-75 cursor-pointer select-none">
          {m.settings_icons()}
        </summary>
        <p className="text-xs fuwari-text-50">{m.settings_icons_hint()}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {ICON_FIELDS.map((item) => (
            <IconTile key={item.name} {...item} />
          ))}
        </div>
      </details>
    </div>
  );
}

function StudioPost({
  fallbackTitle,
  fallbackSummary,
}: {
  fallbackTitle: string;
  fallbackSummary: string;
}) {
  const { data } = useQuery(recentPostsQuery(1));
  const post = data?.[0];
  const title = post?.title || m.settings_preview_empty_title();
  const summary =
    post?.summary || fallbackSummary || m.settings_preview_empty_summary();
  const cover = post?.cover?.url;

  return (
    <div className="fuwari-card-base w-full md:w-72 shrink-0 p-3 shadow-sm flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between text-[11px] fuwari-text-50">
        <span>{m.settings_preview_badge()}</span>
      </div>
      <div className="flex gap-3 min-w-0">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-16 h-16 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-(--fuwari-btn-regular-bg) shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium fuwari-text-90 line-clamp-2">
            {title}
          </p>
          <p className="mt-1 text-xs fuwari-text-50 line-clamp-2">
            {summary || fallbackTitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function NavLinksEditor() {
  const { control, register, setValue, watch, formState } =
    useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.navLinks",
  });
  const linkErrors = formState.errors.site?.navLinks;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium fuwari-text-75">
          {m.settings_site_nav_title()}
        </p>
        <p className="mt-1 text-xs fuwari-text-50">
          {m.settings_site_nav_hint()}
        </p>
      </div>

      <div className="space-y-2">
        {fields.length > 0 ? (
          <div className="flex gap-2 px-1 text-[11px] fuwari-text-50">
            <span className="w-28 shrink-0">{m.settings_site_nav_name()}</span>
            <span className="min-w-0 flex-1">{m.settings_site_nav_url()}</span>
            <span className="w-10 shrink-0" />
          </div>
        ) : null}
        {fields.map((field, index) => {
          const href = watch(`site.navLinks.${index}.href`) ?? "";
          const canonicalHref = canonicalizeNavHref(href);
          const labelError = linkErrors?.[index]?.label?.message;
          const hrefError = linkErrors?.[index]?.href?.message;
          return (
            <div key={field.id} className="space-y-1">
              <div className="flex gap-2">
                <input
                  {...register(`site.navLinks.${index}.label`)}
                  placeholder={m.settings_site_nav_label_ph()}
                  className={cn(SETTINGS_FIELD_CLASS, "w-28 shrink-0")}
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
                  <X size={16} />
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
          className="fuwari-btn-regular rounded-xl h-10 px-3 text-sm gap-1"
        >
          <Plus size={14} />
          {m.settings_site_nav_add()}
        </button>
      ) : null}
    </div>
  );
}

function SocialPills() {
  const { control, register, watch, setValue } = useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.social",
  });
  const social = useWatch({ control, name: "site.social" }) ?? [];
  const [selected, setSelected] = useState<number | null>(
    fields.length ? 0 : null,
  );
  const taken = (key: string, except: number) =>
    key !== "custom" &&
    social.some((item, index) => index !== except && item.platform === key);
  const unused = SOCIAL_PLATFORM_KEYS.filter(
    (key) => key === "custom" || !social.some((item) => item.platform === key),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
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
              onClick={() => setSelected(index)}
              className={cn(
                "fuwari-btn-regular rounded-xl h-10 w-10",
                selected === index && "ring-2 ring-(--fuwari-primary)",
              )}
              aria-label={preset?.label ?? field.label ?? ""}
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
            className="fuwari-btn-regular rounded-xl h-10 px-3 text-sm gap-1"
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
              <div className="flex flex-col gap-2">
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
