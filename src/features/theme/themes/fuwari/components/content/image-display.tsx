import ZoomableImage from "./zoomable-image";

export function ImageDisplay({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="not-prose my-8 group relative block fuwari-onload-animation select-none overflow-hidden rounded-xl">
      {/* Image Container with Fuwari aesthetics */}
      <div className="relative">
        {/* Dark mode overlay to reduce glow - matching original Fuwari */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-transparent dark:bg-black/10 transition-colors duration-300 rounded-xl" />

        <ZoomableImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] scale-100 group-hover:scale-[1.01]"
        />
      </div>

      {/* Caption Content */}
      {alt && (
        <figcaption className="mt-4 p-0 flex items-center justify-center gap-2 px-4 text-center">
          <span className="text-sm font-medium fuwari-text-50 transition-colors duration-500 group-hover:fuwari-text-75 select-none">
            {alt}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
