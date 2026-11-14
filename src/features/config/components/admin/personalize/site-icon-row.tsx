import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { blogConfig } from "@/blog.config";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StatusText } from "@/components/ui/status-text";
import {
  AssetFileButton,
  OverlayUpload,
} from "@/features/config/components/admin/overlay-upload";
import { previewSrc } from "@/features/config/components/admin/preview-src";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  isUploadedIcon,
  resolveFaviconSvg,
  SITE_ICON_MIN_SIZE,
  SITE_ICON_SIZES,
  SITE_ICON_SVG_PATH,
  type SiteIconField,
} from "@/features/config/utils/site-icon";
import { toast } from "@/lib/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

/**
 * The icons the public pages show for the form as it stands, resolved as
 * `resolveSiteConfig` does, and whether each is an upload.
 */
export function useSiteIconPreview() {
  const { control } = useFormContext<SystemConfig>();
  const icons = {
    favicon96: useWatch({ control, name: "site.icons.favicon96" }),
    faviconSvg: useWatch({ control, name: "site.icons.faviconSvg" }),
  };
  const uploadedRaster = isUploadedIcon("favicon96", icons.favicon96);
  return {
    raster:
      (uploadedRaster ? previewSrc(icons.favicon96) : null) ??
      blogConfig.icons.favicon96,
    svg: previewSrc(resolveFaviconSvg(icons)),
    uploadedRaster,
    uploadedSvg: isUploadedIcon("faviconSvg", icons.faviconSvg),
  };
}

type Notice = { tone: "refused" | "notResized"; text: string };

/**
 * 「站点图标」: one square raster upload that the server makes every size
 * from, and an optional SVG for browser tabs. Removing either brings back the
 * default.
 */
export function SiteIconRow() {
  const { setValue } = useFormContext<SystemConfig>();
  const icons = useSiteIconPreview();
  const [notice, setNotice] = useState<Notice | null>(null);

  const setRaster = (addresses: (field: SiteIconField) => string) => {
    for (const { field } of SITE_ICON_SIZES) {
      setValue(`site.icons.${field}`, addresses(field), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const upload = useMutation(
    orpc.config.admin.uploadIcon.mutationOptions({
      onMutate: () => setNotice(null),
      onSuccess: (result) => {
        setRaster((field) => result.icons[field]);
        if (result.resized) {
          toast.success(m.settings_asset_upload_success());
        } else {
          setNotice({
            tone: "notResized",
            text: m.personalize_site_icon_not_resized(),
          });
        }
      },
      onError: (error) => {
        if (isDefinedError(error) && error.code === "SITE_ICON_INVALID") {
          setNotice({ tone: "refused", text: refusalText(error.data) });
          return;
        }
        toast.error(m.settings_asset_upload_fail(), {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    }),
  );

  return (
    <section className="site-theme-row">
      <div className="site-section-copy">
        <strong>{m.personalize_site_icon()}</strong>
        <p>{m.personalize_site_icon_hint()}</p>
      </div>
      <div className="site-icon-list">
        <div className="site-icon-item">
          <span className="site-icon-preview" aria-hidden="true">
            <img src={icons.raster} alt="" />
          </span>
          <p className="site-icon-text">
            <span id="site-icon-raster-name">
              {m.personalize_site_icon_raster()}
            </span>
            <small>
              {m.personalize_site_icon_raster_hint({ min: SITE_ICON_MIN_SIZE })}
            </small>
          </p>
          <div className="site-icon-actions">
            {icons.uploadedRaster ? (
              <Button
                variant="quiet"
                size="sm"
                aria-describedby="site-icon-raster-name"
                onClick={() => {
                  setRaster(() => "");
                  setNotice(null);
                }}
              >
                {m.personalize_site_icon_remove()}
              </Button>
            ) : null}
            <AssetFileButton
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              pending={upload.isPending}
              onFile={(file) => upload.mutate({ file })}
              describedBy="site-icon-raster-name"
            >
              {icons.uploadedRaster
                ? m.settings_replace()
                : m.settings_asset_upload_btn()}
            </AssetFileButton>
          </div>
        </div>
        {notice?.tone === "refused" ? (
          <StatusText error className="site-icon-notice">
            {notice.text}
          </StatusText>
        ) : notice ? (
          <Callout
            tone="warning"
            icon={TriangleAlert}
            role="status"
            className="site-icon-notice"
          >
            {notice.text}
          </Callout>
        ) : null}
        <div className="site-icon-item">
          <span className="site-icon-preview" aria-hidden="true">
            {icons.svg ? <img src={icons.svg} alt="" /> : null}
          </span>
          <p className="site-icon-text">
            <span id="site-icon-svg-name">{m.personalize_site_icon_svg()}</span>
            <small>{m.personalize_site_icon_svg_hint()}</small>
          </p>
          <div className="site-icon-actions">
            {icons.uploadedSvg ? (
              <Button
                variant="quiet"
                size="sm"
                aria-describedby="site-icon-svg-name"
                onClick={() =>
                  setValue("site.icons.faviconSvg", "", { shouldDirty: true })
                }
              >
                {m.personalize_site_icon_remove()}
              </Button>
            ) : null}
            <OverlayUpload
              name="site.icons.faviconSvg"
              assetPath={SITE_ICON_SVG_PATH}
              accept=".svg,image/svg+xml"
              variant="outline"
              describedBy="site-icon-svg-name"
              label={
                icons.uploadedSvg
                  ? m.settings_replace()
                  : m.settings_asset_upload_btn()
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function refusalText(data: {
  detail: "UNSUPPORTED_TYPE" | "NOT_SQUARE" | "TOO_SMALL" | "UNREADABLE";
  width?: number;
  height?: number;
}) {
  const size = { width: data.width ?? 0, height: data.height ?? 0 };
  switch (data.detail) {
    case "NOT_SQUARE":
      return m.personalize_site_icon_not_square(size);
    case "TOO_SMALL":
      return m.personalize_site_icon_too_small({
        ...size,
        min: SITE_ICON_MIN_SIZE,
      });
    case "UNSUPPORTED_TYPE":
      return m.personalize_site_icon_unsupported();
    case "UNREADABLE":
      return m.personalize_site_icon_unreadable();
    default:
      data.detail satisfies never;
      return m.personalize_site_icon_unreadable();
  }
}
