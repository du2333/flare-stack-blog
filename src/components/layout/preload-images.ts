import type { SiteConfig } from "@/features/config/site-config.schema";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";

export function getHomeBackgroundPreloadImages(
  siteConfig: SiteConfig,
): Array<string> {
  return siteConfig.theme.fuwari.homeBg
    ? [
        getPublicImageSrc(
          siteConfig.theme.fuwari.homeBg,
          PUBLIC_IMAGE_WIDTH.banner,
        ),
      ]
    : [];
}
