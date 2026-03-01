import { useState } from "react";
import { X } from "lucide-react";

interface ImageDisplayProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export function ImageDisplay({
  src,
  alt,
  width,
  height,
  caption,
}: ImageDisplayProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <figure className="my-8">
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onClick={() => setIsZoomed(true)}
          className="rounded-lg shadow-lg cursor-zoom-in hover:opacity-95 transition-opacity mx-auto"
          loading="lazy"
        />
        {caption && (
          <figcaption className="text-center mt-3 text-sm text-[var(--cuckoo-text-muted)]">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Image Modal / Lightbox */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cuckoo-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="关闭"
          >
            <X size={32} />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-[95vw] max-h-[95vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
