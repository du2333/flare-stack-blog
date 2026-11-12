import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ExternalLink,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { FormField } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OverlayUpload } from "@/features/config/components/admin/overlay-upload";
import { previewSrc } from "@/features/config/components/admin/preview-src";
import type { SystemConfig } from "@/features/config/config.schema";
import { SITE_DESCRIPTION_MAX } from "@/features/config/site-config.schema";
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
import { SettingsDisclosure } from "./settings-disclosure";
import { useNavSort } from "./use-nav-sort";
import "./site-studio.css";

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

export function SiteStudio() {
  return (
    <div className="site-studio">
      <TextFields />
      <SocialLinksEditor />
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
      <p className="site-moved-hint">
        {m.settings_site_moved_to_personalize()}
        <Link
          to="/admin/personalize"
          className={buttonClass({ variant: "text", size: "sm" })}
        >
          {m.settings_site_moved_to_personalize_link()}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}

/** The title, the author and the description: a labelled row each, with where it shows. */
function TextFields() {
  const { register, control, formState } = useFormContext<SystemConfig>();
  const errors = formState.errors.site;
  const description = useWatch({ control, name: "site.description" }) ?? "";
  return (
    <section className="site-fields">
      <FormField
        label={m.settings_site_field_title()}
        hint={m.settings_site_title_hint()}
        error={errors?.title?.message}
      >
        <Input
          {...register("site.title")}
          placeholder={m.settings_site_field_title_ph()}
        />
      </FormField>
      <FormField
        label={m.settings_site_field_author()}
        hint={m.settings_site_author_hint()}
        error={errors?.author?.message}
      >
        <Input
          {...register("site.author")}
          placeholder={m.settings_site_field_author_ph()}
        />
      </FormField>
      <FormField
        label={m.settings_site_field_description()}
        hint={
          <>
            {m.settings_site_description_hint()}
            <span className="site-char-count">
              {m.settings_site_char_count({
                count: description.length,
                max: SITE_DESCRIPTION_MAX,
              })}
            </span>
          </>
        }
        error={errors?.description?.message}
      >
        <Textarea
          {...register("site.description")}
          rows={3}
          placeholder={m.settings_site_field_description_ph()}
        />
      </FormField>
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

function SocialLinksEditor() {
  const { control, register, watch, setValue, formState } =
    useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.social",
  });
  const social = useWatch({ control, name: "site.social" }) ?? [];
  const taken = (key: string, except: number) =>
    key !== "custom" &&
    social.some((item, index) => index !== except && item.platform === key);
  const unused = SOCIAL_PLATFORM_KEYS.filter(
    (key) => key === "custom" || !social.some((item) => item.platform === key),
  );
  const error = formState.errors.site?.social;

  return (
    <section className="site-nav-section">
      <div className="site-section-copy">
        <h2>{m.settings_social_title()}</h2>
        <p>{m.settings_social_hint()}</p>
      </div>
      <div className="site-social-rows">
        {fields.map((field, index) => {
          const platform = watch(`site.social.${index}.platform`);
          const urlPlaceholder =
            platform === "email"
              ? m.settings_social_email_ph()
              : platform === "rss"
                ? m.settings_social_rss_ph()
                : m.settings_social_url_ph();
          const rowError =
            error?.[index]?.url?.message ?? error?.[index]?.label?.message;
          return (
            <div key={field.id} className="site-social-item">
              <div className="site-social-row">
                <Select
                  value={platform ?? ""}
                  aria-label={m.settings_social_platform_label()}
                  onChange={(next) =>
                    setValue(
                      `site.social.${index}.platform`,
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
                    disabled: taken(key, index),
                  }))}
                />
                <Input
                  {...register(`site.social.${index}.url`)}
                  aria-label={m.settings_social_address_label()}
                  placeholder={urlPlaceholder}
                />
                <IconButton
                  size="md"
                  tone="danger"
                  onClick={() => remove(index)}
                  label={m.settings_social_remove()}
                >
                  <X size={16} />
                </IconButton>
              </div>
              {platform === "custom" ? (
                <div className="site-social-row site-social-custom">
                  <Input
                    {...register(`site.social.${index}.label`)}
                    aria-label={m.settings_social_label_label()}
                    placeholder={m.settings_social_label_ph()}
                  />
                  <OverlayUpload
                    name={`site.social.${index}.icon`}
                    assetPath={`social/custom-${index}`}
                    accept=".svg,.png,.webp"
                    variant="regular"
                    label={
                      watch(`site.social.${index}.icon`)
                        ? m.settings_replace()
                        : m.settings_social_custom_icon_upload()
                    }
                  />
                </div>
              ) : null}
              {rowError ? (
                <p className="fuwari-form-field-error">{rowError}</p>
              ) : null}
            </div>
          );
        })}
      </div>
      {unused.length > 0 ? (
        <Button
          variant="text"
          size="sm"
          onClick={() => {
            const next = unused[0];
            if (next) append({ platform: next, url: "" });
          }}
          icon={<Plus size={14} />}
          className="site-add-link"
        >
          {m.settings_social_add()}
        </Button>
      ) : null}
    </section>
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
