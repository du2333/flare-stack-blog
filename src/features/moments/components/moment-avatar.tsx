import { useRouteContext } from "@tanstack/react-router";
import {
  getPublicImageSrc,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";

/** The author's avatar, as it heads a Moment and the box that writes one. */
export function MomentAvatar() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  return (
    <img
      src={getPublicImageSrc(
        siteConfig.theme.fuwari.avatar,
        PUBLIC_IMAGE_WIDTH.avatar,
      )}
      alt=""
      width={40}
      height={40}
      className="size-10 shrink-0 rounded-full object-cover"
    />
  );
}
