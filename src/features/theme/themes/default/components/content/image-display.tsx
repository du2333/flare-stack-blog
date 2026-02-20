import ZoomableImage from "@/features/theme/themes/default/components/content/zoomable-image";

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
    <figure className="my-12 group relative block">
      {/* Image Container */}
      <div className="relative overflow-hidden rounded-sm border border-border/40">
        <ZoomableImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-cover max-h-200 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] scale-100 group-hover:scale-[1.01]"
          showHint={true}
        />
      </div>

      {/* Caption Content */}
      {alt && (
        <figcaption className="mt-3 flex items-center justify-center gap-2">
          <span className="text-[10px] font-mono font-medium text-muted-foreground/60 tracking-[0.2em] transition-colors duration-500 group-hover:text-foreground/80">
            {alt}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
