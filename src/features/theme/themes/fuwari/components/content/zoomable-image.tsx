import { ClientOnly } from "@tanstack/react-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ZoomableImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height"
> {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

function Lightbox({
  src,
  alt,
  isOpen,
  onClose,
  thumbRect,
}: {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  thumbRect: DOMRect | null;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Sync isRendered with isOpen to handle mounting/unmounting
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      setIsOpening(true);
      document.body.style.overflow = "hidden";

      // Trigger opening transition in next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsOpening(false);
        });
      });
    } else if (isRendered) {
      // Trigger exit animation
      setIsClosing(true);
      document.body.style.overflow = "";

      // Wait for animation to finish before unmounting
      timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 500); // Wait for the 500ms transition
    }

    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen, isRendered]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // FLIP animations (both enter and exit)
  useLayoutEffect(() => {
    if (isRendered && thumbRect && imgRef.current) {
      const img = imgRef.current;
      const finalRect = img.getBoundingClientRect();

      const scaleX = thumbRect.width / finalRect.width;
      const scaleY = thumbRect.height / finalRect.height;
      const translateX =
        thumbRect.left +
        thumbRect.width / 2 -
        (finalRect.left + finalRect.width / 2);
      const translateY =
        thumbRect.top +
        thumbRect.height / 2 -
        (finalRect.top + finalRect.height / 2);

      if (!isClosing) {
        // Enter animation
        img.style.transition = "none";
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

        img.offsetHeight; // Force reflow

        img.style.transition =
          "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease";
        img.style.transform = "translate(0, 0) scale(1)";
      } else {
        // Exit animation
        img.style.transition =
          "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.5s ease";
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
      }
    }
  }, [isRendered, isClosing, thumbRect]);

  if (!isRendered) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-200 flex items-center justify-center transition-opacity duration-500 ease-out pointer-events-auto",
        isOpening || isClosing ? "opacity-0" : "opacity-100",
      )}
    >
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 cursor-zoom-out"
        onClick={onClose}
      />

      {/* Controls */}
      <div
        className={cn(
          "absolute top-4 right-4 flex gap-2 z-210 p-4 transition-opacity duration-300",
          isOpening || isClosing ? "opacity-0" : "opacity-100",
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group"
          title="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            className="fill-white/70 group-hover:fill-white"
          >
            <path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z" />
          </svg>
        </button>
      </div>

      {/* Image Container */}
      <div
        className="relative z-205 flex items-center justify-center max-w-[90vw] max-h-[90vh] cursor-zoom-out"
        onClick={onClose}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="block max-w-full max-h-full object-contain"
          style={{ transformOrigin: "center center" }}
        />
      </div>
    </div>,
    document.body,
  );
}

export default function ZoomableImage({
  src,
  alt = "",
  width,
  height,
  className,
  ...props
}: ZoomableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [thumbRect, setThumbRect] = useState<DOMRect | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!src) return null;

  const handleOpen = () => {
    if (imgRef.current) {
      setThumbRect(imgRef.current.getBoundingClientRect());
    }
    setIsOpen(true);
  };

  return (
    <>
      <div
        className="w-full h-auto cursor-zoom-in group select-none overflow-hidden m-0 p-0 rounded-xl"
        onClick={handleOpen}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          className={cn(
            "w-full h-auto block transition-all duration-500 will-change-transform m-0 p-0",
            className,
          )}
          {...props}
        />
      </div>

      <ClientOnly>
        <Lightbox
          src={src}
          alt={alt}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          thumbRect={thumbRect}
        />
      </ClientOnly>
    </>
  );
}
