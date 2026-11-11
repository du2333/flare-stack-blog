import { Link, useRouteContext } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { resolveBrandMarkImage } from "@/features/config/utils/brand-mark";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";

const BRAND_MARK_SIZE = 28;

/** The mark before the title: the built-in icon unless the Site Config picks another. */
function BrandMark() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  if (siteConfig.brandMark === "none") return null;
  const image = resolveBrandMarkImage(siteConfig.brandMark, siteConfig);
  if (!image) {
    return (
      <span className="sidebar-brand-mark" data-mark="default">
        <Home size={16} strokeWidth={2} />
      </span>
    );
  }
  return (
    <img
      src={
        image.kind === "avatar"
          ? getPublicImageSrc(image.src, PUBLIC_IMAGE_WIDTH.avatar)
          : image.src
      }
      alt=""
      width={BRAND_MARK_SIZE}
      height={BRAND_MARK_SIZE}
      className="sidebar-brand-mark"
      data-mark={image.kind}
    />
  );
}

/**
 * The brand mark and the site title, a link to the home page: at the head of
 * the rail and, below 1024px, of the top bar.
 */
export function Brand() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  return (
    <Link to="/" className="sidebar-brand" title={siteConfig.title}>
      <BrandMark />
      <span>{siteConfig.title}</span>
    </Link>
  );
}
