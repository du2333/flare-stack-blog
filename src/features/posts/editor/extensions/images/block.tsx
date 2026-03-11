import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { m } from "@/paraglide/messages";

export function ImageBlock({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const src = node.attrs.src;
  const isUploading = useMemo(() => src?.startsWith("blob:"), [src]);

  return (
    <NodeViewWrapper className="my-12 relative image-node-view">
      <div
        className={`
            relative overflow-hidden transition-all duration-200 border-2
            ${
              selected
                ? "border-foreground"
                : "border-transparent hover:border-border/50"
            }
        `}
      >
        <div
          className="relative bg-muted/20 overflow-hidden"
          style={{
            aspectRatio:
              node.attrs.width && node.attrs.height
                ? `${node.attrs.width} / ${node.attrs.height}`
                : "auto",
          }}
        >
          <img
            src={src}
            alt={node.attrs.alt}
            className={`w-full h-auto max-h-[80vh] object-contain mx-auto transition-opacity duration-300 ${
              isUploading ? "opacity-50 grayscale" : "opacity-100"
            }`}
          />

          {/* Uploading Status */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-background/90 border border-border px-4 py-2 flex items-center gap-3">
                <Loader2 className="animate-spin" size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {m.media_upload_status_uploading()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption / Alt Text */}
      <div className="mt-3 flex items-center justify-center">
        <input
          type="text"
          value={node.attrs.alt || ""}
          onChange={(e) => updateAttributes({ alt: e.target.value })}
          placeholder={
            isUploading ? "..." : m.editor_image_caption_placeholder()
          }
          disabled={isUploading}
          className="bg-transparent text-center text-[11px] font-mono text-muted-foreground focus:text-foreground focus:outline-none w-full max-w-md placeholder:text-muted-foreground/30 transition-colors disabled:opacity-50"
        />
      </div>
    </NodeViewWrapper>
  );
}
