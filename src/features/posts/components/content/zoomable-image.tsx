import type React from "react";
import {
  getPublicImageSrc,
  getPublicImageSrcSet,
  PUBLIC_IMAGE_WIDTH,
} from "@/features/media/utils/media.utils";
import { cn } from "@/lib/utils";

interface ZoomableImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "width" | "height"
> {
  /** The stored image URL, before any transform. */
  src?: string;
  alt?: string;
  /** Original pixel size, when known. */
  width?: number;
  height?: number;
  /** Width of the inline variant; a 2x variant is offered alongside it. */
  displayWidth: number;
  /** Shown under the image in the lightbox. */
  caption?: string;
}

/**
 * What makes a link open `src` in the lightbox: the large variant's address
 * and its size for PhotoSwipe. Cloudflare never upscales, so the large variant
 * is at most the original.
 */
export function zoomableImageLinkProps(
  src: string,
  width?: number | null,
  height?: number | null,
) {
  const zoomWidth = PUBLIC_IMAGE_WIDTH.zoom;
  const scale = width ? Math.min(1, zoomWidth / width) : 1;
  return {
    href: getPublicImageSrc(src, zoomWidth),
    "data-zoomable-image": "",
    "data-pswp-width": width ? Math.round(width * scale) : undefined,
    "data-pswp-height": height ? Math.round(height * scale) : undefined,
  };
}

/**
 * An inline image that opens in the lightbox of the enclosing
 * `usePhotoSwipeGallery`. Without JavaScript the link opens the large image.
 */
export default function ZoomableImage({
  src,
  alt = "",
  width,
  height,
  displayWidth,
  caption,
  className,
  loading = "lazy",
  fetchPriority,
  sizes = "(min-width: 1200px) 800px, 100vw",
  ...props
}: ZoomableImageProps) {
  if (!src) return null;

  const isPortrait = !!(width && height && height > width);

  return (
    <a
      {...zoomableImageLinkProps(src, width, height)}
      data-caption={caption || undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "block cursor-zoom-in select-none overflow-hidden m-0 p-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fuwari-primary)",
        isPortrait
          ? "flex items-center justify-center w-full max-h-[70vh]"
          : "w-full h-auto",
      )}
    >
      <img
        src={getPublicImageSrc(src, displayWidth)}
        srcSet={getPublicImageSrcSet(src, [displayWidth, displayWidth * 2])}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        className={cn(
          className,
          "transition-all duration-500 will-change-transform m-0 p-0",
          isPortrait
            ? "h-auto w-auto max-h-[70vh] max-w-full mx-auto block"
            : "w-full h-auto block max-h-[80vh] object-contain",
        )}
        {...props}
      />
    </a>
  );
}
