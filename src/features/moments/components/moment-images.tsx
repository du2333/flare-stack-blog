import { useRef } from "react";
import type { MomentImage } from "@/features/moments/schema/moments.schema";
import {
  momentImageLayout,
  singleImageBox,
} from "@/features/moments/utils/moment-images";
import {
  getPublicImageSrc,
  getPublicImageSrcSet,
} from "@/features/media/utils/media.utils";
import { usePhotoSwipeGallery } from "@/features/posts/components/content/photo-swipe";
import { zoomableImageLinkProps } from "@/features/posts/components/content/zoomable-image";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const LINK_CLASS =
  "relative block cursor-zoom-in select-none overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--fuwari-primary)";

/**
 * A Moment's images in a grid: one large keeping its ratio, two to four in
 * two columns, five to nine in three, and past nine the first nine with +N on
 * the ninth. Any of them opens the lightbox over all the images, the ones
 * past nine included, which sit hidden in the gallery.
 */
export function MomentImages({
  momentId,
  images,
}: {
  momentId: number;
  images: Array<MomentImage>;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  usePhotoSwipeGallery(galleryRef, momentId);

  if (images.length === 0) return null;
  const { columns, shown, more } = momentImageLayout(images.length);
  const single = singleImageBox(images[0].width, images[0].height, "24rem");
  const alt = (index: number) =>
    m.moments_image_alt({ index: index + 1, count: images.length });

  return (
    <div ref={galleryRef}>
      {columns === 1 ? (
        <a
          {...zoomableImageLinkProps(
            images[0].url,
            images[0].width,
            images[0].height,
          )}
          target="_blank"
          rel="noreferrer"
          style={single.style}
          className={cn(
            LINK_CLASS,
            "max-w-full rounded-xl bg-(--fuwari-btn-regular-bg)",
            !single.known && "max-w-xl",
          )}
        >
          <img
            src={getPublicImageSrc(images[0].url, 800)}
            srcSet={getPublicImageSrcSet(images[0].url, [800, 1600])}
            sizes="(min-width: 768px) 40rem, 100vw"
            alt={alt(0)}
            width={images[0].width ?? undefined}
            height={images[0].height ?? undefined}
            loading="lazy"
            decoding="async"
            className="block size-full object-contain"
          />
        </a>
      ) : (
        <div
          className={cn(
            "grid max-w-xl gap-1.5",
            columns === 2 ? "grid-cols-2" : "grid-cols-3",
          )}
        >
          {images.slice(0, shown).map((image, index) => {
            const displayWidth = columns === 2 ? 400 : 300;
            const covered = more > 0 && index === shown - 1;
            return (
              <a
                key={image.key}
                {...zoomableImageLinkProps(
                  image.url,
                  image.width,
                  image.height,
                )}
                target="_blank"
                rel="noreferrer"
                aria-label={
                  covered
                    ? m.moments_images_view_all({ count: images.length })
                    : undefined
                }
                className={cn(
                  LINK_CLASS,
                  "group",
                  columns === 2 ? "aspect-4/3" : "aspect-square",
                )}
              >
                <img
                  src={getPublicImageSrc(image.url, displayWidth)}
                  srcSet={getPublicImageSrcSet(image.url, [
                    displayWidth,
                    displayWidth * 2,
                  ])}
                  sizes={
                    columns === 2
                      ? "(min-width: 768px) 20rem, 50vw"
                      : "(min-width: 768px) 13rem, 33vw"
                  }
                  alt={alt(index)}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {covered ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white"
                  >
                    +{more}
                  </span>
                ) : null}
              </a>
            );
          })}
        </div>
      )}
      {/* The images past the grid: in the gallery for the lightbox, not on the page. */}
      {images.slice(shown).map((image) => (
        <a
          key={image.key}
          {...zoomableImageLinkProps(image.url, image.width, image.height)}
          hidden
          target="_blank"
          rel="noreferrer"
        >
          {image.key}
        </a>
      ))}
    </div>
  );
}
